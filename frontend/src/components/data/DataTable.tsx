import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Box,
  Chip,
  Avatar,
  Button,
  TextField,
  InputAdornment,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface Column<T = any> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  maxWidth?: number;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  format?: (value: any) => string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'chip' | 'avatar' | 'actions';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string;
  title?: string;
  subtitle?: string;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selected: T[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  onRefresh?: () => void;
  onExport?: (data: T[]) => void;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  emptyMessage?: string;
  rowActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T, index: number) => void;
    disabled?: (row: T) => boolean;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  }>;
  bulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (selected: T[]) => void;
    disabled?: (selected: T[]) => boolean;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  }>;
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
}

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  error,
  title,
  subtitle,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  searchable = false,
  searchPlaceholder = 'Search...',
  filterable = false,
  exportable = false,
  refreshable = false,
  onRefresh,
  onExport,
  pagination = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  dense = false,
  stickyHeader = false,
  maxHeight,
  emptyMessage = 'No data available',
  rowActions = [],
  bulkActions = [],
  getRowId = (row, index) => index,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [orderBy, setOrderBy] = useState<keyof T | string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuRow, setActionMenuRow] = useState<T | null>(null);

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm && searchable) {
      filtered = filtered.filter((row) =>
        columns.some((column) => {
          const value = row[column.id as keyof T];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (orderBy) {
      filtered.sort((a, b) => {
        const aValue = a[orderBy as keyof T];
        const bValue = b[orderBy as keyof T];

        if (aValue < bValue) {
          return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, orderBy, order, columns, searchable]);

  // Pagination
  const paginatedData = pagination
    ? processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : processedData;

  const handleSort = (columnId: keyof T | string) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(processedData);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (row: T) => {
    const selectedIndex = selectedRows.findIndex(
      (selected) => getRowId(selected) === getRowId(row)
    );
    let newSelected: T[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedRows, row];
    } else {
      newSelected = selectedRows.filter(
        (selected) => getRowId(selected) !== getRowId(row)
      );
    }

    onSelectionChange?.(newSelected);
  };

  const isSelected = (row: T) =>
    selectedRows.some((selected) => getRowId(selected) === getRowId(row));

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, row: T) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setActionMenuRow(row);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActionMenuRow(null);
  };

  const renderCellContent = (column: Column<T>, value: any, row: T, index: number) => {
    if (column.render) {
      return column.render(value, row, index);
    }

    switch (column.type) {
      case 'chip':
        return (
          <Chip
            label={value}
            size="small"
            color={value === 'active' ? 'success' : 'default'}
          />
        );
      case 'avatar':
        return <Avatar src={value} sx={{ width: 32, height: 32 }} />;
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'actions':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {rowActions.map((action, actionIndex) => (
              <Tooltip key={actionIndex} title={action.label}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(row, index);
                  }}
                  disabled={action.disabled?.(row)}
                  color={action.color}
                >
                  {action.icon}
                </IconButton>
              </Tooltip>
            ))}
            {rowActions.length > 3 && (
              <IconButton
                size="small"
                onClick={(e) => handleActionMenuOpen(e, row)}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        );
      default:
        return column.format ? column.format(value) : String(value || '');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <LoadingSpinner message="Loading data..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        {refreshable && (
          <Button onClick={onRefresh} startIcon={<RefreshIcon />} sx={{ mt: 2 }}>
            Retry
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
        <Box sx={{ flex: '1 1 100%' }}>
          {title && (
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Search */}
          {searchable && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Bulk Actions */}
          {selectable && selectedRows.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  size="small"
                  startIcon={action.icon}
                  onClick={() => action.onClick(selectedRows)}
                  disabled={action.disabled?.(selectedRows)}
                  color={action.color}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Action Buttons */}
          {refreshable && (
            <IconButton onClick={onRefresh}>
              <RefreshIcon />
            </IconButton>
          )}
          {exportable && (
            <IconButton onClick={() => onExport?.(processedData)}>
              <ExportIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>

      {/* Table */}
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader={stickyHeader} size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedRows.length > 0 && selectedRows.length < processedData.length
                    }
                    checked={
                      processedData.length > 0 && selectedRows.length === processedData.length
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    width: column.width,
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const isItemSelected = isSelected(row);
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <TableRow
                    hover
                    onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={getRowId(row)}
                    selected={isItemSelected}
                    className={rowClassName?.(row, index)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          inputProps={{ 'aria-labelledby': labelId }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(row);
                          }}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.id as keyof T];
                      return (
                        <TableCell key={String(column.id)} align={column.align}>
                          {renderCellContent(column, value, row, index)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination && (
        <TablePagination
          rowsPerPageOptions={pageSizeOptions}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {rowActions.slice(3).map((action, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              if (actionMenuRow) {
                action.onClick(actionMenuRow, 0);
              }
              handleActionMenuClose();
            }}
            disabled={actionMenuRow ? action.disabled?.(actionMenuRow) : false}
          >
            {action.icon && <Box sx={{ mr: 1 }}>{action.icon}</Box>}
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}