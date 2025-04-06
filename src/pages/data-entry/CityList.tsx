import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { debounce } from 'lodash';
import { 
  Building, Plus, Loader2, AlertCircle, 
  CheckCircle, X, Edit2, ArrowUpDown,
  Search
} from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableRow, Paper, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions,
  TextField, TablePagination, TableSortLabel,
  InputAdornment, FormControl, InputLabel,
  Select, MenuItem
} from '@mui/material';

interface City {
  id: string;
  name: string;
  country_id: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface Country {
  id: string;
  name: string;
}

type Order = 'asc' | 'desc';

export function CityList() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    country_id: '',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof City>('name');
  const [order, setOrder] = useState<Order>('asc');

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      const { data, error } = await supabase
        .from('country')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching countries:', error);
        return;
      }

      setCountries(data || []);
    };

    fetchCountries();
  }, [supabase]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setLoading(true);

        let query = supabase
          .from('city')
          .select('*, country!inner(name)', { count: 'exact' });

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

        setCities(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error searching cities:', err);
        setError('Failed to search cities');
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

  const handleSort = (property: keyof City) => {
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

  const validateCityName = (name: string): boolean => {
    const regex = /^[A-Z\s]*$/;
    return regex.test(name);
  };

  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, name: upperValue }));
    
    if (!validateCityName(upperValue)) {
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

      if (!validateCityName(formData.name)) {
        setError('Invalid city name format');
        return;
      }

      if (!formData.country_id) {
        setError('Please select a country');
        return;
      }

      const trimmedName = formData.name.trim();

      let query = supabase
        .from('city')
        .select('id')
        .eq('name', trimmedName)
        .eq('country_id', formData.country_id);
      
      if (editingCity?.id) {
        query = query.neq('id', editingCity.id);
      }

      const { data: existingCity } = await query.maybeSingle();

      if (existingCity) {
        setError('A city with this name already exists in the selected country');
        return;
      }

      if (editingCity) {
        const { error: updateError } = await supabase
          .from('city')
          .update({ 
            name: trimmedName,
            country_id: formData.country_id,
            updated_by: user.id,
          })
          .eq('id', editingCity.id);

        if (updateError) throw updateError;
        setSuccess('City updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('city')
          .insert([{ 
            name: trimmedName,
            country_id: formData.country_id,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
        setSuccess('City added successfully');
      }

      handleCloseDialog();
      debouncedSearch(searchTerm); // Refresh the list
    } catch (err) {
      console.error('Error saving city:', err);
      setError('Failed to save city. Please try again.');
    }
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setFormData({ 
      name: city.name,
      country_id: city.country_id
    });
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCity(null);
    setFormData({ name: '', country_id: '' });
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
          <Building className="w-6 h-6 text-blue-500" />
          Cities
        </h1>
        <div className="flex items-center gap-4">
          <TextField
            placeholder="Search cities..."
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
            Add City
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
                  active={orderBy === 'country_id'}
                  direction={orderBy === 'country_id' ? order : 'asc'}
                  onClick={() => handleSort('country_id')}
                  IconComponent={ArrowUpDown}
                >
                  Country
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
            {cities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {searchTerm ? 'No cities found matching your search' : 'No cities available'}
                </TableCell>
              </TableRow>
            ) : (
              cities.map((city: any) => (
                <TableRow key={city.id}>
                  <TableCell>{city.name}</TableCell>
                  <TableCell>{city.country.name}</TableCell>
                  <TableCell>
                    {new Date(city.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {city.updated_at 
                      ? new Date(city.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit2 className="w-4 h-4" />}
                      onClick={() => handleEdit(city)}
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
          {editingCity ? 'Edit City' : 'Add New City'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <TextField
              fullWidth
              label="City Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              helperText="Only English letters (A-Z) and spaces are allowed"
              error={!!error}
            />
            <FormControl fullWidth>
              <InputLabel>Country</InputLabel>
              <Select
                value={formData.country_id}
                label="Country"
                onChange={(e) => setFormData({ ...formData, country_id: e.target.value })}
              >
                {countries.map((country) => (
                  <MenuItem key={country.id} value={country.id}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            {editingCity ? 'Update' : 'Add'} City
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
