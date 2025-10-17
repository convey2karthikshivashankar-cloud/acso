import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  IconButton,
  Chip,
  Avatar,
  Box,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Skeleton,
  Alert,
  Paper,
  Toolbar,
  Button,
  Collapse,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  KeyboardArrowDown,
  KeyboardArrowUp,
  GetApp,
  Refresh,
  ViewColumn,
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

export interface Column<T = any> {
  id: keyof T;
  label: string;
  minWidth?: number;
  maxWidth?: number;
  width?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  filterable?: boolean;
  format?: (value: any, row: T) => React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'chip' | 'avatar' | 'actions';
  sticky?: boolean;
  hidden?: boolean;
}

export interface EnhancedDataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string;
  selectable?: boolean;
  expandable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  pagination?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  defaultOrderBy?: keyof T;
  defaultOrder?: 'asc' | 'desc';
  onRowClick?: (row: T, index: number) => void;
  onRowSelect?: (selectedRows: T[]) => void;
  onSort?: (orderBy: keyof T, order: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (searchTerm: string) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  onRefresh?: () => void;
  renderExpandedRow?: (row: T, index: number) => React.ReactNode;
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  sx?: object;
}

export const EnhancedDataTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  error,
  selectable = false,
  expandable = false,
  searchable = true,
  filterable = true,
  exportable = false,
  refreshable = false,
  pagination = true,
  dense = false,
  stickyHeader = false,
  maxHeight = 400,
  rowsPerPageOptions = [5, 10, 25, 50],
  defaultRowsPerPage = 10,
  defaultOrderBy,
  defaultOrder = 'asc',
  onRowClick,
  onRowSelect,
  onSort,
  onFilter,
  onSearch,
  onExport,
  onRefresh,
  renderExpandedRow,
  renderRowActions,
  emptyMessage = 'No data available',
  sx = {},
}: EnhancedDataTableProps<T>) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = React.useState<keyof T | undefined>(defaultOrderBy);
  const [order, setOrder] = React.useState<'asc' | 'desc'>(defaultOrder);
  const [selected, setSelected] = React.useState<T[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>(
    columns.reduce((acc, col) => ({ ...acc, [col.id as string]: !col.hidden }), {})
  );

  const visibleColumns = columns.filter(col => columnVisibility[col.id as string]);

  const handleRequestSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    setOrder(newOrder);
    setOrderBy(property);
    onSort?.(property, newOrder);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(data);
      onRowSelect?.(data);
    } else {
      setSelected([]);
      onRowSelect?.([]);
    }
  };

  const handleRowSelect = (row: T) => {
    const selectedIndex = selected.findIndex(item => item === row);
    let newSelected: T[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, row];
    } else {
      newSelected = selected.filter(item => item !== row);
    }

    setSelected(newSelected);
    onRowSelect?.(newSelected);
  };

  const handleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (row: T) => selected.includes(row);

  const formatCellValue = (column: Column<T>, value: any, row: T) => {
    if (column.format) {
      return column.format(value, row);
    }

    switch (column.type) {
      case 'boolean':
        return (
          <Chip
            label={value ? 'Yes' : 'No'}
            color={value ? 'success' : 'default'}
            size="small"
          />
        );
      case 'chip':
        return (
          <Chip
            label={value}
            size="small"
            variant="outlined"
          />
        );
      case 'avatar':
        return (
          <Avatar
            src={value}
            sx={{ width: 32, height: 32 }}
          >
            {typeof value === 'string' ? value.charAt(0).toUpperCase() : '?'}
          </Avatar>
        );
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return value || '-';
    }
  };

  const renderTableToolbar = () => (
    <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
      <Box sx={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', gap: 2 }}>
        {searchable && (
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
        )}
        
        {selected.length > 0 && (
          <Typography variant="subtitle1" component="div">
            {selected.length} selected
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {filterable && (
          <Tooltip title="Filter">
            <IconButton>
              <FilterList />
            </IconButton>
          </Tooltip>
        )}
        
        {refreshable && (
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        )}
        
        {exportable && (
          <Tooltip title="Export">
            <IconButton onClick={() => onExport?.('csv')}>
              <GetApp />
            </IconButton>
          </Tooltip>
        )}
        
        <Tooltip title="Column visibility">
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <ViewColumn />
          </IconButton>
        </Tooltip>
      </Box>
    </Toolbar>
  );

  const renderSkeletonRows = () => (
    Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={index}>
        {selectable && (
          <TableCell padding="checkbox">
            <Skeleton variant="rectangular" width={20} height={20} />
          </TableCell>
        )}
        {expandable && (
          <TableCell>
            <Skeleton variant="rectangular" width={20} height={20} />
          </TableCell>
        )}
        {visibleColumns.map((column) => (
          <TableCell key={column.id as string}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ))
  );

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', ...sx }}>
      {renderTableToolbar()}
      
      <TableContainer sx={{ maxHeight }}>
        <Table
          stickyHeader={stickyHeader}
          size={dense ? 'small' : 'medium'}
          aria-label="enhanced table"
        >
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              {expandable && <TableCell />}
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id as string}
                  align={column.align}
                  style={{
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    width: column.width,
                  }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                      {orderBy === column.id ? (
                        <Box component="span" sx={visuallyHidden}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {renderRowActions && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    visibleColumns.length +
                    (selectable ? 1 : 0) +
                    (expandable ? 1 : 0) +
                    (renderRowActions ? 1 : 0)
                  }
                  align="center"
                >
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  const isItemSelected = isSelected(row);
                  const labelId = `enhanced-table-checkbox-${index}`;
                  const isExpanded = expandedRows.has(index);

                  return (
                    <React.Fragment key={index}>
                      <TableRow
                        hover
                        onClick={() => onRowClick?.(row, index)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        selected={isItemSelected}
                        sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                      >
                        {selectable && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              color="primary"
                              checked={isItemSelected}
                              onChange={() => handleRowSelect(row)}
                              inputProps={{ 'aria-labelledby': labelId }}
                            />
                          </TableCell>
                        )}
                        {expandable && (
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowExpand(index);
                              }}
                            >
                              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          </TableCell>
                        )}
                        {visibleColumns.map((column) => (
                          <TableCell
                            key={column.id as string}
                            align={column.align}
                            id={column.id === visibleColumns[0]?.id ? labelId : undefined}
                          >
                            {formatCellValue(column, row[column.id], row)}
                          </TableCell>
                        ))}
                        {renderRowActions && (
                          <TableCell align="right">
                            {renderRowActions(row, index)}
                          </TableCell>
                        )}
                      </TableRow>
                      {expandable && renderExpandedRow && (
                        <TableRow>
                          <TableCell
                            style={{ paddingBottom: 0, paddingTop: 0 }}
                            colSpan={
                              visibleColumns.length +
                              (selectable ? 1 : 0) +
                              (expandable ? 1 : 0) +
                              (renderRowActions ? 1 : 0)
                            }
                          >
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 1 }}>
                                {renderExpandedRow(row, index)}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}

      {/* Column Visibility Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {columns.map((column) => (
          <MenuItem
            key={column.id as string}
            onClick={() => {
              setColumnVisibility(prev => ({
                ...prev,
                [column.id as string]: !prev[column.id as string]
              }));
            }}
          >
            <Checkbox
              checked={columnVisibility[column.id as string]}
              size="small"
            />
            {column.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};