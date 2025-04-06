import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { debounce } from 'lodash';
import { 
  Factory, Plus, Loader2, AlertCircle, 
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

interface Line {
  id: string;
  name: string;
  company_id: string;
  district_id: string;
  line_type_id: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  city: {
    name: string;
    country: {
      name: string;
    };
  };
}

interface LineType {
  id: string;
  name: string;
}

type Order = 'asc' | 'desc';

export function LineList() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [lines, setLines] = useState<Line[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [lineTypes, setLineTypes] = useState<LineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    company_id: '',
    district_id: '',
    line_type_id: '',
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof Line>('name');
  const [order, setOrder] = useState<Order>('asc');

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      const [
        { data: companiesData },
        { data: districtsData },
        { data: lineTypesData }
      ] = await Promise.all([
        supabase.from('company').select('id, name').order('name'),
        supabase.from('district').select('id, name, city:city_id(name, country:country_id(name))').order('name'),
        supabase.from('line_type').select('id, name').order('name')
      ]);

      setCompanies(companiesData || []);
      setDistricts(districtsData || []);
      setLineTypes(lineTypesData || []);
    };

    fetchReferenceData();
  }, [supabase]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setLoading(true);

        let query = supabase
          .from('line')
          .select(`
            *,
            company:company_id(name),
            district:district_id(
              name,
              city:city_id(
                name,
                country:country_id(name)
              )
            ),
            line_type:line_type_id(name)
          `, { count: 'exact' });

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

        setLines(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error searching lines:', err);
        setError('Failed to search lines');
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

  const handleSort = (property: keyof Line) => {
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

  const validateLineName = (name: string): boolean => {
    const regex = /^[A-Z0-9\s-]*$/;
    return regex.test(name);
  };

  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, name: upperValue }));
    
    if (!validateLineName(upperValue)) {
      setError('Only English letters (A-Z), numbers (0-9), spaces, and hyphens are allowed');
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

      if (!validateLineName(formData.name)) {
        setError('Invalid line name format');
        return;
      }

      if (!formData.company_id || !formData.district_id || !formData.line_type_id) {
        setError('All fields are required');
        return;
      }

      const trimmedName = formData.name.trim();

      let query = supabase
        .from('line')
        .select('id')
        .eq('name', trimmedName)
        .eq('company_id', formData.company_id)
        .eq('district_id', formData.district_id);
      
      if (editingLine?.id) {
        query = query.neq('id', editingLine.id);
      }

      const { data: existingLine } = await query.maybeSingle();

      if (existingLine) {
        setError('A line with this name already exists in the selected company and district');
        return;
      }

      if (editingLine) {
        const { error: updateError } = await supabase
          .from('line')
          .update({ 
            name: trimmedName,
            company_id: formData.company_id,
            district_id: formData.district_id,
            line_type_id: formData.line_type_id,
            updated_by: user.id,
          })
          .eq('id', editingLine.id);

        if (updateError) throw updateError;
        setSuccess('Line updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('line')
          .insert([{ 
            name: trimmedName,
            company_id: formData.company_id,
            district_id: formData.district_id,
            line_type_id: formData.line_type_id,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
        setSuccess('Line added successfully');
      }

      handleCloseDialog();
      debouncedSearch(searchTerm); // Refresh the list
    } catch (err) {
      console.error('Error saving line:', err);
      setError('Failed to save line. Please try again.');
    }
  };

  const handleEdit = (line: Line) => {
    setEditingLine(line);
    setFormData({ 
      name: line.name,
      company_id: line.company_id,
      district_id: line.district_id,
      line_type_id: line.line_type_id
    });
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLine(null);
    setFormData({ 
      name: '',
      company_id: '',
      district_id: '',
      line_type_id: ''
    });
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
          <Factory className="w-6 h-6 text-blue-500" />
          Production Lines
        </h1>
        <div className="flex items-center gap-4">
          <TextField
            placeholder="Search lines..."
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
            Add Line
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
                  active={orderBy === 'company_id'}
                  direction={orderBy === 'company_id' ? order : 'asc'}
                  onClick={() => handleSort('company_id')}
                  IconComponent={ArrowUpDown}
                >
                  Company
                </TableSortLabel>
              </TableCell>
              <TableCell>District</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Line Type</TableCell>
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
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {searchTerm ? 'No lines found matching your search' : 'No lines available'}
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>{line.company.name}</TableCell>
                  <TableCell>{line.district.name}</TableCell>
                  <TableCell>{line.district.city.name}</TableCell>
                  <TableCell>{line.district.city.country.name}</TableCell>
                  <TableCell>{line.line_type.name}</TableCell>
                  <TableCell>
                    {new Date(line.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {line.updated_at 
                      ? new Date(line.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit2 className="w-4 h-4" />}
                      onClick={() => handleEdit(line)}
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
          {editingLine ? 'Edit Line' : 'Add New Line'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <TextField
              fullWidth
              label="Line Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              helperText="Only English letters (A-Z), numbers (0-9), spaces, and hyphens are allowed"
              error={!!error}
            />
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <Select
                value={formData.company_id}
                label="Company"
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>District</InputLabel>
              <Select
                value={formData.district_id}
                label="District"
                onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
              >
                {districts.map((district) => (
                  <MenuItem key={district.id} value={district.id}>
                    {district.name} ({district.city.name}, {district.city.country.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Line Type</InputLabel>
              <Select
                value={formData.line_type_id}
                label="Line Type"
                onChange={(e) => setFormData({ ...formData, line_type_id: e.target.value })}
              >
                {lineTypes.map((lineType) => (
                  <MenuItem key={lineType.id} value={lineType.id}>
                    {lineType.name}
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
            {editingLine ? 'Update' : 'Add'} Line
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
