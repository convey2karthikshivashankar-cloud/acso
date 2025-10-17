import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Autocomplete,
  DatePicker,
  Switch,
  FormControlLabel,
  Divider,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

export interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  filter: FilterGroup;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  tags: string[];
}

interface FilterBuilderProps {
  initialFilter?: FilterGroup;
  availableFields: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'array';
    options?: Array<{ value: any; label: string }>;
  }>;
  templates?: FilterTemplate[];
  onFilterChange: (filter: FilterGroup) => void;
  onSaveTemplate?: (template: Omit<FilterTemplate, 'id' | 'createdAt'>) => void;
  onLoadTemplate?: (template: FilterTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  initialFilter,
  availableFields,
  templates = [],
  onFilterChange,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
}) => {
  const [filter, setFilter] = useState<FilterGroup>(
    initialFilter || {
      id: 'root',
      logic: 'AND',
      conditions: [],
      groups: [],
    }
  );
  
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTags, setTemplateTags] = useState<string[]>([]);
  const [isPublicTemplate, setIsPublicTemplate] = useState(false);

  const getOperatorsForType = (type: string) => {
    switch (type) {
      case 'string':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' },
          { value: 'regex', label: 'Regex' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
          { value: 'lessThanOrEqual', label: 'Less than or equal' },
          { value: 'between', label: 'Between' },
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' },
          { value: 'last7Days', label: 'Last 7 days' },
          { value: 'last30Days', label: 'Last 30 days' },
          { value: 'thisMonth', label: 'This month' },
          { value: 'thisYear', label: 'This year' },
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Equals' },
        ];
      case 'array':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'containsAll', label: 'Contains all' },
          { value: 'containsAny', label: 'Contains any' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' },
        ];
      default:
        return [];
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const updateFilter = useCallback((newFilter: FilterGroup) => {
    setFilter(newFilter);
    onFilterChange(newFilter);
  }, [onFilterChange]);

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: generateId(),
      field: availableFields[0]?.key || '',
      operator: 'equals',
      value: '',
      type: availableFields[0]?.type || 'string',
    };

    const updatedFilter = addConditionToGroup(filter, groupId, newCondition);
    updateFilter(updatedFilter);
  };

  const addGroup = (parentGroupId: string) => {
    const newGroup: FilterGroup = {
      id: generateId(),
      logic: 'AND',
      conditions: [],
      groups: [],
    };

    const updatedFilter = addGroupToGroup(filter, parentGroupId, newGroup);
    updateFilter(updatedFilter);
  };

  const updateCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
    const updatedFilter = updateConditionInGroup(filter, conditionId, updates);
    updateFilter(updatedFilter);
  };

  const deleteCondition = (conditionId: string) => {
    const updatedFilter = deleteConditionFromGroup(filter, conditionId);
    updateFilter(updatedFilter);
  };

  const deleteGroup = (groupId: string) => {
    if (groupId === 'root') return; // Can't delete root group
    const updatedFilter = deleteGroupFromGroup(filter, groupId);
    updateFilter(updatedFilter);
  };

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    const updatedFilter = updateGroupLogicInGroup(filter, groupId, logic);
    updateFilter(updatedFilter);
  };

  // Helper functions for immutable updates
  const addConditionToGroup = (group: FilterGroup, targetGroupId: string, condition: FilterCondition): FilterGroup => {
    if (group.id === targetGroupId) {
      return {
        ...group,
        conditions: [...group.conditions, condition],
      };
    }

    return {
      ...group,
      groups: group.groups.map(subGroup => addConditionToGroup(subGroup, targetGroupId, condition)),
    };
  };

  const addGroupToGroup = (group: FilterGroup, targetGroupId: string, newGroup: FilterGroup): FilterGroup => {
    if (group.id === targetGroupId) {
      return {
        ...group,
        groups: [...group.groups, newGroup],
      };
    }

    return {
      ...group,
      groups: group.groups.map(subGroup => addGroupToGroup(subGroup, targetGroupId, newGroup)),
    };
  };

  const updateConditionInGroup = (group: FilterGroup, conditionId: string, updates: Partial<FilterCondition>): FilterGroup => {
    return {
      ...group,
      conditions: group.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      ),
      groups: group.groups.map(subGroup => updateConditionInGroup(subGroup, conditionId, updates)),
    };
  };

  const deleteConditionFromGroup = (group: FilterGroup, conditionId: string): FilterGroup => {
    return {
      ...group,
      conditions: group.conditions.filter(condition => condition.id !== conditionId),
      groups: group.groups.map(subGroup => deleteConditionFromGroup(subGroup, conditionId)),
    };
  };

  const deleteGroupFromGroup = (group: FilterGroup, groupId: string): FilterGroup => {
    return {
      ...group,
      groups: group.groups
        .filter(subGroup => subGroup.id !== groupId)
        .map(subGroup => deleteGroupFromGroup(subGroup, groupId)),
    };
  };

  const updateGroupLogicInGroup = (group: FilterGroup, groupId: string, logic: 'AND' | 'OR'): FilterGroup => {
    if (group.id === groupId) {
      return { ...group, logic };
    }

    return {
      ...group,
      groups: group.groups.map(subGroup => updateGroupLogicInGroup(subGroup, groupId, logic)),
    };
  };

  const renderCondition = (condition: FilterCondition, groupId: string) => {
    const field = availableFields.find(f => f.key === condition.field);
    const operators = getOperatorsForType(condition.type);

    const handleFieldChange = (newField: string) => {
      const fieldConfig = availableFields.find(f => f.key === newField);
      if (fieldConfig) {
        updateCondition(condition.id, {
          field: newField,
          type: fieldConfig.type,
          operator: getOperatorsForType(fieldConfig.type)[0]?.value || 'equals',
          value: '',
        });
      }
    };

    const renderValueInput = () => {
      const needsValue = !['isEmpty', 'isNotEmpty', 'last7Days', 'last30Days', 'thisMonth', 'thisYear'].includes(condition.operator);
      
      if (!needsValue) {
        return null;
      }

      switch (condition.type) {
        case 'string':
          if (field?.options) {
            return (
              <Autocomplete
                options={field.options}
                getOptionLabel={(option) => option.label}
                value={field.options.find(opt => opt.value === condition.value) || null}
                onChange={(_, newValue) => updateCondition(condition.id, { value: newValue?.value || '' })}
                renderInput={(params) => <TextField {...params} size="small" />}
                sx={{ minWidth: 200 }}
              />
            );
          }
          return (
            <TextField
              size="small"
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              sx={{ minWidth: 200 }}
            />
          );

        case 'number':
          if (condition.operator === 'between') {
            return (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  value={condition.value?.min || ''}
                  onChange={(e) => updateCondition(condition.id, { 
                    value: { ...condition.value, min: parseFloat(e.target.value) || 0 }
                  })}
                  sx={{ width: 100 }}
                />
                <Typography variant="body2">and</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={condition.value?.max || ''}
                  onChange={(e) => updateCondition(condition.id, { 
                    value: { ...condition.value, max: parseFloat(e.target.value) || 0 }
                  })}
                  sx={{ width: 100 }}
                />
              </Box>
            );
          }
          return (
            <TextField
              size="small"
              type="number"
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) || 0 })}
              sx={{ minWidth: 150 }}
            />
          );

        case 'date':
          if (condition.operator === 'between') {
            return (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <DatePicker
                  value={condition.value?.start || null}
                  onChange={(date) => updateCondition(condition.id, { 
                    value: { ...condition.value, start: date }
                  })}
                  slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                />
                <Typography variant="body2">and</Typography>
                <DatePicker
                  value={condition.value?.end || null}
                  onChange={(date) => updateCondition(condition.id, { 
                    value: { ...condition.value, end: date }
                  })}
                  slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                />
              </Box>
            );
          }
          return (
            <DatePicker
              value={condition.value || null}
              onChange={(date) => updateCondition(condition.id, { value: date })}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 200 } } }}
            />
          );

        case 'boolean':
          return (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              >
                <MenuItem value={true}>True</MenuItem>
                <MenuItem value={false}>False</MenuItem>
              </Select>
            </FormControl>
          );

        case 'array':
          if (field?.options) {
            return (
              <Autocomplete
                multiple
                options={field.options}
                getOptionLabel={(option) => option.label}
                value={field.options.filter(opt => condition.value?.includes(opt.value)) || []}
                onChange={(_, newValue) => updateCondition(condition.id, { 
                  value: newValue.map(v => v.value) 
                })}
                renderInput={(params) => <TextField {...params} size="small" />}
                sx={{ minWidth: 250 }}
              />
            );
          }
          return (
            <TextField
              size="small"
              value={Array.isArray(condition.value) ? condition.value.join(', ') : ''}
              onChange={(e) => updateCondition(condition.id, { 
                value: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
              })}
              placeholder="Enter values separated by commas"
              sx={{ minWidth: 250 }}
            />
          );

        default:
          return null;
      }
    };

    return (
      <Box key={condition.id} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Field</InputLabel>
          <Select
            value={condition.field}
            onChange={(e) => handleFieldChange(e.target.value)}
            label="Field"
          >
            {availableFields.map(field => (
              <MenuItem key={field.key} value={field.key}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Operator</InputLabel>
          <Select
            value={condition.operator}
            onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
            label="Operator"
          >
            {operators.map(op => (
              <MenuItem key={op.value} value={op.value}>
                {op.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {renderValueInput()}

        <IconButton
          size="small"
          onClick={() => deleteCondition(condition.id)}
          color="error"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    );
  };

  const renderGroup = (group: FilterGroup, depth = 0) => {
    const hasContent = group.conditions.length > 0 || group.groups.length > 0;

    return (
      <Card key={group.id} sx={{ mb: 2, ml: depth * 2 }} variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">
                {depth === 0 ? 'Filter' : 'Group'}
              </Typography>
              {hasContent && (
                <FormControl size="small">
                  <Select
                    value={group.logic}
                    onChange={(e) => updateGroupLogic(group.id, e.target.value as 'AND' | 'OR')}
                  >
                    <MenuItem value="AND">AND</MenuItem>
                    <MenuItem value="OR">OR</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
            <Box>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addCondition(group.id)}
                sx={{ mr: 1 }}
              >
                Add Condition
              </Button>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addGroup(group.id)}
                sx={{ mr: 1 }}
              >
                Add Group
              </Button>
              {group.id !== 'root' && (
                <IconButton
                  size="small"
                  onClick={() => deleteGroup(group.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          {group.conditions.map(condition => renderCondition(condition, group.id))}
          {group.groups.map(subGroup => renderGroup(subGroup, depth + 1))}

          {!hasContent && (
            <Alert severity="info">
              No conditions or groups defined. Add a condition or group to start building your filter.
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const clearFilter = () => {
    const emptyFilter: FilterGroup = {
      id: 'root',
      logic: 'AND',
      conditions: [],
      groups: [],
    };
    updateFilter(emptyFilter);
  };

  const saveTemplate = () => {
    if (!onSaveTemplate || !templateName.trim()) return;

    const template: Omit<FilterTemplate, 'id' | 'createdAt'> = {
      name: templateName.trim(),
      description: templateDescription.trim(),
      filter: { ...filter },
      isPublic: isPublicTemplate,
      createdBy: 'current-user', // This would come from auth context
      tags: templateTags,
    };

    onSaveTemplate(template);
    setSaveDialogOpen(false);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateTags([]);
    setIsPublicTemplate(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterIcon sx={{ mr: 1 }} />
          Filter Builder
        </Typography>
        <Box>
          {templates.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => setShowTemplates(!showTemplates)}
              startIcon={showTemplates ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mr: 1 }}
            >
              Templates
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => setSaveDialogOpen(true)}
            disabled={!onSaveTemplate}
            sx={{ mr: 1 }}
          >
            Save Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={clearFilter}
          >
            Clear
          </Button>
        </Box>
      </Box>

      <Collapse in={showTemplates}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filter Templates
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {templates.map(template => (
                <Chip
                  key={template.id}
                  label={template.name}
                  onClick={() => onLoadTemplate?.(template)}
                  onDelete={() => onDeleteTemplate?.(template.id)}
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Collapse>

      {renderGroup(filter)}

      {/* Save Template Dialog */}
      {saveDialogOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setSaveDialogOpen(false)}
        >
          <Card
            sx={{ p: 3, minWidth: 400, maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom>
              Save Filter Template
            </Typography>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={templateTags}
              onChange={(_, newValue) => setTemplateTags(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Tags" placeholder="Add tags" />
              )}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isPublicTemplate}
                  onChange={(e) => setIsPublicTemplate(e.target.checked)}
                />
              }
              label="Make template public"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={saveTemplate}
                disabled={!templateName.trim()}
              >
                Save
              </Button>
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default FilterBuilder;