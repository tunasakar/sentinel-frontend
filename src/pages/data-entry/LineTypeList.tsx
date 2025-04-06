import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { debounce } from 'lodash';
import { 
  Cog, Plus, Loader2, AlertCircle, 
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

interface LineType {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

type Order = 'asc' | 'desc';

export function LineTypeList() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [lineTypes, setLineTypes] = useState<LineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLineType, setEditingLineType] = useState<LineType | null>(null);
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
  const [orderBy, setOrderBy] = useState<keyof LineType>('name');
  const [order, setOrder] = useState<Order>('asc');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setLoading(true);

        let query = supabase
          .from('line_type')
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

        setLineTypes(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error searching line types:', err);
        setError('Failed to search line types');
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

  const handleSort = (property: keyof LineType) => {
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

  const validateLineTypeName = (name: string): boolean => {
    const regex = /^[A-Z\s]*$/;
    return regex.test(name);
  };

  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, name: upperValue }));
    
    if (!validateLineTypeName(upperValue)) {
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

      if (!validateLineTypeName(formData.name)) {
        setError('Invalid line type name format');
        return;
      }

      const trimmedName = formData.name.trim();

      let query = supabase
        .from('line_type')
        .select('id')
        .eq('name', trimmedName);
      
      if (editingLineType?.id) {
        query = query.neq('id', editingLineType.id);
      }

      const { data: existingLineType } = await query.maybeSingle();

      if (existingLineType) {
        setError('A line type with this name already exists');
        return;
      }

      if (editingLineType) {
        const { error: updateError } = await supabase
          .from('line_type')
          .update({ 
            name: trimmedName,
            updated_by: user.id,
          })
          .eq('id', editingLineType.id);

        if (updateError) throw updateError;
        setSuccess('Line type updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('line_type')
          .insert([{ 
            name: trimmedName,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
        setSuccess('Line type added successfully');
      }

      handleCloseDialog();
      debouncedSearch(searchTerm); // Refresh the list
    } catch (err) {
      console.error('Error saving line type:', err);
      setError('Failed to save line type. Please try again.');
    }
  };

  const handleEdit = (lineType: LineType) => {
    setEditingLineType(lineType);
    setFormData({ name: lineType.name });
    setOpenDialog(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLineType(null);
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
          <Cog className="w-6 h-6 text-blue-500" />
          Line Types
        </h1>
        <div className="flex items-center gap-4">
          <TextField
            placeholder="Search line types..."
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
            Add Line Type
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
            {lineTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {searchTerm ? 'No line types found matching your search' : 'No line types available'}
                </TableCell>
              </TableRow>
            ) : (
              lineTypes.map((lineType) => (
                <TableRow key={lineType.id}>
                  <TableCell>{lineType.name}</TableCell>
                  <TableCell>
                    {new Date(lineType.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {lineType.updated_at 
                      ? new Date(lineType.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit2 className="w-4 h-4" />}
                      onClick={() => handleEdit(lineType)}
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
          {editingLineType ? 'Edit Line Type' : 'Add New Line Type'}
        </DialogTitle>
        <DialogContent>
          <div className="pt-4">
            <TextField
              fullWidth
              label="Line Type Name"
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
            {editingLineType ? 'Update' : 'Add'} Line Type
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
