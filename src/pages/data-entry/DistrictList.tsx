import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { debounce } from 'lodash';
import { 
  MapPin, Plus, Loader2, AlertCircle, 
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

interface District {
  id: string;
  name: string;
  city_id: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface City {
  id: string;
  name: string;
  country: {
    id: string;
    name: string;
  };
}

type Order = 'asc' | 'desc';

export function DistrictList() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city_id: '',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof District>('name');
  const [order, setOrder] = useState<Order>('asc');

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      const { data, error } = await supabase
        .from('city')
        .select('id, name, country:country_id(id, name)')
        .order('name');

      if (error) {
        console.error('Error fetching cities:', error);
        return;
      }

      setCities(data || []);
    };

    fetchCities();
  }, [supabase]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setLoading(true);

        let query = supabase
          .from('district')
          .select('*, city!inner(name, country:country_id(name))', { count: 'exact' });

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

        setDistricts(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error searching districts:', err);
        setError('Failed to search districts');
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

  const handleSort = (property: keyof District) => {
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

  const validateDistrictName = (name: string): boolean => {
    const regex = /^[A-Z\s]*$/;
    return regex.test(name);
  };

  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, name: upperValue }));
    
    if (!validateDistrictName(upperValue)) {
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

      if (!validateDistrictName(formData.name)) {
        setError('Invalid district name format');
        return;
      }

      if (!formData.city_id) {
        setError('Please select a city');
        return;
      }

      const trimmedName = formData.name.trim();

      let query = supabase
        .from('district')
        .select('id')
        .eq('name', trimmedName)
        .eq('city_id', formData.city_id);
      
      if (editingDistrict?.id) {
        query = query.neq('id', editingDistrict.id);
      }

      const { data: existingDistrict } = await query.maybeSingle();

      if (existingDistrict) {
        setError('A district with this name already exists in the selected city');
        return;
      }

      if (editingDistrict) {
        const { error: updateError } = await supabase
          .from('district')
          .update({ 
            name: trimmedName,
            city_id: formData.city_id,
            updated_by: user.id,
          })
          .eq('id', editingDistrict.id);

        if (updateError) throw updateError;
        setSuccess('District updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('district')
          .insert([{ 
            name: trimmedName,
            city_id: formData.city_id,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
        setSuccess('District added successfully');
      }

      handleCloseDialog();
      debouncedSearch(searchTerm); // Refresh the list
    } catch (err) {
      console.error('Error saving district:', err);
      setError('Failed to save district. Please try again.');
    }
  };

  const handleEdit = (district: District) => {
    setEditingDistrict(district);
    setFormData({ 
      name: district.name,
      city_id: district.city_id
    });
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDistrict(null);
    setFormData({ name: '', city_id: '' });
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
          <MapPin className="w-6 h-6 text-blue-500" />
          Districts
        </h1>
        <div className="flex items-center gap-4">
          <TextField
            placeholder="Search districts..."
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
            Add District
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
                  active={orderBy === 'city_id'}
                  direction={orderBy === 'city_id' ? order : 'asc'}
                  onClick={() => handleSort('city_id')}
                  IconComponent={ArrowUpDown}
                >
                  City
                </TableSortLabel>
              </TableCell>
              <TableCell>Country</TableCell>
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
            {districts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchTerm ? 'No districts found matching your search' : 'No districts available'}
                </TableCell>
              </TableRow>
            ) : (
              districts.map((district: any) => (
                <TableRow key={district.id}>
                  <TableCell>{district.name}</TableCell>
                  <TableCell>{district.city.name}</TableCell>
                  <TableCell>{district.city.country.name}</TableCell>
                  <TableCell>
                    {new Date(district.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {district.updated_at 
                      ? new Date(district.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit2 className="w-4 h-4" />}
                      onClick={() => handleEdit(district)}
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
          {editingDistrict ? 'Edit District' : 'Add New District'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <TextField
              fullWidth
              label="District Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              helperText="Only English letters (A-Z) and spaces are allowed"
              error={!!error}
            />
            <FormControl fullWidth>
              <InputLabel>City</InputLabel>
              <Select
                value={formData.city_id}
                label="City"
                onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
              >
                {cities.map((city) => (
                  <MenuItem key={city.id} value={city.id}>
                    {city.name} ({city.country.name})
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
            {editingDistrict ? 'Update' : 'Add'} District
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
