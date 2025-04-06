import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { debounce } from 'lodash';
import { 
  Globe, Plus, Loader2, AlertCircle, 
  CheckCircle, X, Edit2, ArrowUpDown,
  Search
} from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableRow, Paper, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions,
  TextField, TablePagination, TableSortLabel,
  InputAdornment
} from '@mui/material';

interface Country {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

type Order = 'asc' | 'desc';

export function CountryList() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof Country>('name');
  const [order, setOrder] = useState<Order>('asc');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setLoading(true);

        let query = supabase
          .from('country')
          .select('*', { count: 'exact' });

        // Apply search filter if term exists
        if (term) {
          query = query.ilike('name', `%${term}%`);
        }

        // Apply sorting
        query = query
          .order(orderBy, { ascending: order === 'asc' })
          .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);

        const { data, count, error } = await query;

        if (error) throw error;

        setCountries(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error searching countries:', err);
        setError('Failed to search countries');
      } finally {
        setLoading(false);
      }
    }, 300),
    [orderBy, order, page, rowsPerPage]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, orderBy, order, page, rowsPerPage]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when search changes
  };

  const handleSort = (property: keyof Country) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting changes
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const validateCountryName = (name: string): boolean => {
    const regex = /^[A-Z\s]*$/;
    return regex.test(name);
  };

  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, name: upperValue }));
    
    if (!validateCountryName(upperValue)) {
      setError('Only English letters (A-Z) and spaces are allowed');
    } else {
      setError(null);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!user) {
        setError('You must be logged in to perform this action');
        return;
      }

      if (!validateCountryName(formData.name)) {
        setError('Invalid country name format');
        return;
      }

      const trimmedName = formData.name.trim();

      let query = supabase
        .from('country')
        .select('id')
        .eq('name', trimmedName);
      
      if (editingCountry?.id) {
        query = query.neq('id', editingCountry.id);
      }

      const { data: existingCountry } = await query.maybeSingle();

      if (existingCountry) {
        setError('A country with this name already exists');
        return;
      }

      if (editingCountry) {
        const { error: updateError } = await supabase
          .from('country')
          .update({ 
            name: trimmedName,
            updated_by: user.id,
          })
          .eq('id', editingCountry.id);

        if (updateError) throw updateError;
        setSuccess('Country updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('country')
          .insert([{ 
            name: trimmedName,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
        setSuccess('Country added successfully');
      }

      handleCloseDialog();
      debouncedSearch(searchTerm); // Refresh the list
    } catch (err) {
      console.error('Error saving country:', err);
      setError('Failed to save country. Please try again.');
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({ name: country.name });
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCountry(null);
    setFormData({ name: '' });
    setError(null);
  };

  if (loading && page === 0 && !searchTerm) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-500" />
          Countries
        </h1>
        <div className="flex items-center gap-4">
          <TextField
            placeholder="Search countries..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            sx={{ width: '300px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="w-5 h-5 text-gray-500" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus />}
            onClick={() => setOpenDialog(true)}
          >
            Add Country
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <Paper className="overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleSort('name')}
                  IconComponent={ArrowUpDown}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'created_at'}
                  direction={orderBy === 'created_at' ? order : 'asc'}
                  onClick={() => handleSort('created_at')}
                  IconComponent={ArrowUpDown}
                >
                  Created At
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'updated_at'}
                  direction={orderBy === 'updated_at' ? order : 'asc'}
                  onClick={() => handleSort('updated_at')}
                  IconComponent={ArrowUpDown}
                >
                  Last Updated
                </TableSortLabel>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {countries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {searchTerm ? 'No countries found matching your search' : 'No countries available'}
                </TableCell>
              </TableRow>
            ) : (
              countries.map((country) => (
                <TableRow key={country.id}>
                  <TableCell>{country.name}</TableCell>
                  <TableCell>
                    {new Date(country.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {country.updated_at 
                      ? new Date(country.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit2 className="w-4 h-4" />}
                      onClick={() => handleEdit(country)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[15, 50, 100, 150, 200]}
        />
      </Paper>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCountry ? 'Edit Country' : 'Add New Country'}
        </DialogTitle>
        <DialogContent>
          <div className="pt-4">
            <TextField
              fullWidth
              label="Country Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              helperText="Only English letters (A-Z) and spaces are allowed"
              error={!!error}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<X />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            startIcon={<Plus />}
          >
            {editingCountry ? 'Update' : 'Add'} Country
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
