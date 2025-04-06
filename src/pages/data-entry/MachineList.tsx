import React, { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { debounce } from 'lodash';
import { 
  Box, Plus, Loader2, AlertCircle, 
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

interface Machine {
  id: string;
  name: string;
  order: number;
  line_id: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface Line {
  id: string;
  name: string;
  company: {
    name: string;
  };
  district: {
    name: string;
    city: {
      name: string;
      country: {
        name: string;
      };
    };
  };
}

type Order = 'asc' | 'desc';

interface ValidationErrors {
  name?: string;
  order?: string;
  line?: string;
}

export function MachineList() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    order: 1000,
    line_id: '',
  });
  const [existingOrders, setExistingOrders] = useState<number[]>([]);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof Machine>('order');
  const [order, setOrder] = useState<Order>('asc');

  // Fetch lines
  useEffect(() => {
    const fetchLines = async () => {
      const { data, error } = await supabase
        .from('line')
        .select(`
          id,
          name,
          company:company_id(name),
          district:district_id(
            name,
            city:city_id(
              name,
              country:country_id(name)
            )
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching lines:', error);
        return;
      }

      setLines(data || []);
    };

    fetchLines();
  }, [supabase]);

  // Fetch existing orders for selected line
  const fetchExistingOrders = async (lineId: string) => {
    if (!lineId) {
      setExistingOrders([]);
      return;
    }

    const { data, error } = await supabase
      .from('machine')
      .select('order')
      .eq('line_id', lineId)
      .order('order');

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    const orders = data.map(m => m.order);
    setExistingOrders(orders);

    // Find the next available order number
    let nextOrder = 1000;
    while (orders.includes(nextOrder)) {
      nextOrder++;
    }

    // Only set the order if we're not editing an existing machine
    if (!editingMachine) {
      setFormData(prev => ({ ...prev, order: nextOrder }));
    }
  };

  // Handle line selection
  const handleLineChange = (lineId: string) => {
    setFormData(prev => ({ ...prev, line_id: lineId }));
    setValidationErrors(prev => ({ ...prev, line: undefined }));
    fetchExistingOrders(lineId);
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      try {
        setLoading(true);

        let query = supabase
          .from('machine')
          .select(`
            *,
            line:line_id(
              name,
              company:company_id(name),
              district:district_id(
                name,
                city:city_id(
                  name,
                  country:country_id(name)
                )
              )
            )
          `, { count: 'exact' });

        if (term) {
          query = query.ilike('name', `%${term}%`);
        }

        query = query.order(orderBy, { ascending: order === 'asc' });
        query = query.range(page * rowsPerPage, (page + 1) * rowsPerPage - 1);

        const { data, count, error } = await query;

        if (error) throw error;

        setMachines(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error searching machines:', err);
        setError('Failed to search machines');
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
    setPage(0);
  };

  const handleSort = (property: keyof Machine) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const validateMachineName = (name: string): boolean => {
    const regex = /^[A-Z0-9\s-]*$/;
    return regex.test(name);
  };

  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData(prev => ({ ...prev, name: upperValue }));
    
    if (!validateMachineName(upperValue)) {
      setValidationErrors(prev => ({
        ...prev,
        name: 'Only English letters (A-Z), numbers (0-9), spaces, and hyphens are allowed'
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleOrderChange = (value: string) => {
    const numValue = parseInt(value) || 1000;
    setFormData(prev => ({ ...prev, order: numValue }));
    
    if (numValue < 1000 || numValue > 9999) {
      setValidationErrors(prev => ({
        ...prev,
        order: 'Order must be a 4-digit number (1000-9999)'
      }));
    } else if (existingOrders.includes(numValue) && numValue !== editingMachine?.order) {
      setValidationErrors(prev => ({
        ...prev,
        order: 'This order number is already used in the selected production line'
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, order: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!formData.line_id) {
      newErrors.line = 'Please select a production line';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Machine name is required';
    } else if (!validateMachineName(formData.name)) {
      newErrors.name = 'Only English letters (A-Z), numbers (0-9), spaces, and hyphens are allowed';
    }

    if (formData.order < 1000 || formData.order > 9999) {
      newErrors.order = 'Order must be a 4-digit number (1000-9999)';
    } else if (existingOrders.includes(formData.order) && formData.order !== editingMachine?.order) {
      newErrors.order = 'This order number is already used in the selected production line';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      if (!user) {
        setError('You must be logged in to perform this action');
        return;
      }

      if (!validateForm()) {
        return;
      }

      const trimmedName = formData.name.trim();

      if (editingMachine) {
        const { error: updateError } = await supabase
          .from('machine')
          .update({ 
            name: trimmedName,
            order: formData.order,
            line_id: formData.line_id,
            updated_by: user.id,
          })
          .eq('id', editingMachine.id);

        if (updateError) {
          if (updateError.code === '23505' && updateError.message.includes('machine_line_order_unique')) {
            setValidationErrors(prev => ({
              ...prev,
              order: 'This order number is already used in the selected production line'
            }));
            return;
          }
          throw updateError;
        }
        setSuccess('Machine updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('machine')
          .insert([{ 
            name: trimmedName,
            order: formData.order,
            line_id: formData.line_id,
            created_by: user.id
          }]);

        if (insertError) {
          if (insertError.code === '23505' && insertError.message.includes('machine_line_order_unique')) {
            setValidationErrors(prev => ({
              ...prev,
              order: 'This order number is already used in the selected production line'
            }));
            return;
          }
          throw insertError;
        }
        setSuccess('Machine added successfully');
      }

      handleCloseDialog();
      debouncedSearch(searchTerm);
    } catch (err) {
      console.error('Error saving machine:', err);
      setError('Failed to save machine. Please try again.');
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({ 
      name: machine.name,
      order: machine.order,
      line_id: machine.line_id
    });
    fetchExistingOrders(machine.line_id);
    setOpenDialog(true);
    setError(null);
    setValidationErrors({});
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMachine(null);
    setFormData({ 
      name: '',
      order: 1000,
      line_id: ''
    });
    setExistingOrders([]);
    setError(null);
    setValidationErrors({});
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
          <Box className="w-6 h-6 text-blue-500" />
          Machines
        </h1>
        <div className="flex items-center gap-4">
          <TextField
            placeholder="Search machines..."
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
            Add Machine
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
                  active={orderBy === 'order'}
                  direction={orderBy === 'order' ? order : 'asc'}
                  onClick={() => handleSort('order')}
                  IconComponent={ArrowUpDown}
                >
                  Order
                </TableSortLabel>
              </TableCell>
              <TableCell>Production Line</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>District</TableCell>
              <TableCell>City</TableCell>
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
            {machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {searchTerm ? 'No machines found matching your search' : 'No machines available'}
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine: any) => (
                <TableRow key={machine.id}>
                  <TableCell>{machine.name}</TableCell>
                  <TableCell>{machine.order}</TableCell>
                  <TableCell>{machine.line.name}</TableCell>
                  <TableCell>{machine.line.company.name}</TableCell>
                  <TableCell>{machine.line.district.name}</TableCell>
                  <TableCell>{machine.line.district.city.name}</TableCell>
                  <TableCell>{machine.line.district.city.country.name}</TableCell>
                  <TableCell>
                    {new Date(machine.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {machine.updated_at 
                      ? new Date(machine.updated_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Edit2 className="w-4 h-4" />}
                      onClick={() => handleEdit(machine)}
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
          {editingMachine ? 'Edit Machine' : 'Add New Machine'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <FormControl fullWidth error={!!validationErrors.line}>
              <InputLabel>Production Line</InputLabel>
              <Select
                value={formData.line_id}
                label="Production Line"
                onChange={(e) => handleLineChange(e.target.value)}
              >
                {lines.map((line) => (
                  <MenuItem key={line.id} value={line.id}>
                    {line.name} ({line.company.name} - {line.district.city.name})
                  </MenuItem>
                ))}
              </Select>
              {validationErrors.line && (
                <div className="text-red-500 text-sm mt-1">{validationErrors.line}</div>
              )}
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Order"
              value={formData.order}
              onChange={(e) => handleOrderChange(e.target.value)}
              inputProps={{ min: 1000, max: 9999 }}
              helperText={
                existingOrders.length > 0 
                  ? `Existing orders: ${existingOrders.join(', ')}`
                  : "Enter a 4-digit number (1000-9999). Must be unique within the production line."
              }
              error={!!validationErrors.order}
            />
            {validationErrors.order && (
              <div className="text-red-500 text-sm -mt-3">{validationErrors.order}</div>
            )}
            <TextField
              fullWidth
              label="Machine Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              helperText="Only English letters (A-Z), numbers (0-9), spaces, and hyphens are allowed"
              error={!!validationErrors.name}
            />
            {validationErrors.name && (
              <div className="text-red-500 text-sm -mt-3">{validationErrors.name}</div>
            )}
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
            {editingMachine ? 'Update' : 'Add'} Machine
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
