import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Switch,
  FormControlLabel,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Save,
  Share,
  FilterList,
  ExpandMore,
  Close,
  DragIndicator,
  ContentCopy,
} from '@mui/icons-material';

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'notIn' | 'exists' | 'notExists';
  value: any;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface FilterGroup {
  id: string;
  name: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  subGroups?: FilterGroup[];
}

export interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  filterGroup: FilterGroup;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  tags: string[];
}

export interface FilterField {
  name: string;
  label: string;
  dataType: FilterCondition['dataType'];
  operators: FilterCondition['operator'][];
  options?: { value: any; label: string }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface AdvancedFilterBuilderProps {
  fields: FilterField[];
  initialFilter?: FilterGroup;
  templates?: FilterTemplate[];
  onFilterChange?: (filter: FilterGroup) => void;
  onSaveTemplate?: (template: Omit<FilterTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
  onLoadTemplate?: (template: FilterTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

interface FilterConditionBuilderProps {
  condition: FilterCondition;
  fields: FilterField[];
  onChange: (condition: FilterCondition) => void;
  onDelete: () => void;
}

interface FilterGroupBuilderProps {
  group: FilterGroup;
  fields: FilterField[];
  level: number;
  onChange: (group: FilterGroup) => void;
  onDelete?: () => void;
}

interface FilterTemplatesProps {
  templates: FilterTemplate[];
  onLoad: (template: FilterTemplate) => void;
  onDelete: (templateId: string) => void;
  onSave: (template: Omit<FilterTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
}

const FilterConditionBuilder: React.FC<FilterConditionBuilderProps> = ({
  condition,
  fields,
  onChange,
  onDelete,
}) => {
  const theme = useTheme();
  const field = fields.find(f => f.name === condition.field);

  const handleFieldChange = (fieldName: string) => {
    const newField = fields.find(f => f.name === fieldName);
    if (newField) {
      onChange({
        ...condition,
        field: fieldName,
        dataType: newField.dataType,
        operator: newField.operators[0],
        value: getDefaultValue(newField.dataType),
      });
    }
  };

  const handleOperatorChange = (operator: FilterCondition['operator']) => {
    onChange({
      ...condition,
      operator,
      value: operator === 'between' ? [null, null] : getDefaultValue(condition.dataType),
    });
  };

  const handleValueChange = (value: any) => {
    onChange({ ...condition, value });
  };

  const getDefaultValue = (dataType: FilterCondition['dataType']) => {
    switch (dataType) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'boolean':
        return false;
      case 'array':
        return [];
      default:
        return '';
    }
  };

  const renderValueInput = () => {
    if (!field) return null;

    switch (condition.operator) {
      case 'between':
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              type={condition.dataType === 'number' ? 'number' : condition.dataType === 'date' ? 'date' : 'text'}
              value={condition.value?.[0] || ''}
              onChange={(e) => handleValueChange([e.target.value, condition.value?.[1]])}
              placeholder="From"
            />
            <Typography variant="body2">to</Typography>
            <TextField
              size="small"
              type={condition.dataType === 'number' ? 'number' : condition.dataType === 'date' ? 'date' : 'text'}
              value={condition.value?.[1] || ''}
              onChange={(e) => handleValueChange([condition.value?.[0], e.target.value])}
              placeholder="To"
            />
          </Box>
        );

      case 'in':
      case 'notIn':
        return (
          <TextField
            size="small"
            fullWidth
            value={Array.isArray(condition.value) ? condition.value.join(', ') : ''}
            onChange={(e) => handleValueChange(e.target.value.split(',').map(v => v.trim()).filter(v => v))}
            placeholder="Enter values separated by commas"
            helperText="Separate multiple values with commas"
          />
        );

      case 'exists':
      case 'notExists':
        return null;

      default:
        if (field.options) {
          return (
            <FormControl size="small" fullWidth>
              <Select
                value={condition.value || ''}
                onChange={(e) => handleValueChange(e.target.value)}
              >
                {field.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        if (condition.dataType === 'boolean') {
          return (
            <FormControlLabel
              control={
                <Switch
                  checked={condition.value || false}
                  onChange={(e) => handleValueChange(e.target.checked)}
                />
              }
              label={condition.value ? 'True' : 'False'}
            />
          );
        }

        return (
          <TextField
            size="small"
            fullWidth
            type={condition.dataType === 'number' ? 'number' : condition.dataType === 'date' ? 'date' : 'text'}
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            InputLabelProps={condition.dataType === 'date' ? { shrink: true } : undefined}
          />
        );
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
        },
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <FormControl size="small" fullWidth>
            <InputLabel>Field</InputLabel>
            <Select
              value={condition.field}
              onChange={(e) => handleFieldChange(e.target.value)}
            >
              {fields.map((field) => (
                <MenuItem key={field.name} value={field.name}>
                  {field.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Operator</InputLabel>
            <Select
              value={condition.operator}
              onChange={(e) => handleOperatorChange(e.target.value as FilterCondition['operator'])}
              disabled={!field}
            >
              {field?.operators.map((operator) => (
                <MenuItem key={operator} value={operator}>
                  {operator.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          {renderValueInput()}
        </Grid>

        <Grid item xs={12} sm={1}>
          <Tooltip title="Delete condition">
            <IconButton size="small" onClick={onDelete} color="error">
              <Delete />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>
    </Paper>
  );
};

const FilterGroupBuilder: React.FC<FilterGroupBuilderProps> = ({
  group,
  fields,
  level,
  onChange,
  onDelete,
}) => {
  const theme = useTheme();

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      field: fields[0]?.name || '',
      operator: fields[0]?.operators[0] || 'equals',
      value: '',
      dataType: fields[0]?.dataType || 'string',
    };

    onChange({
      ...group,
      conditions: [...group.conditions, newCondition],
    });
  };

  const updateCondition = (conditionId: string, updatedCondition: FilterCondition) => {
    onChange({
      ...group,
      conditions: group.conditions.map(c => c.id === conditionId ? updatedCondition : c),
    });
  };

  const deleteCondition = (conditionId: string) => {
    onChange({
      ...group,
      conditions: group.conditions.filter(c => c.id !== conditionId),
    });
  };

  const addSubGroup = () => {
    const newSubGroup: FilterGroup = {
      id: Date.now().toString(),
      name: `Group ${(group.subGroups?.length || 0) + 1}`,
      logic: 'AND',
      conditions: [],
      subGroups: [],
    };

    onChange({
      ...group,
      subGroups: [...(group.subGroups || []), newSubGroup],
    });
  };

  const updateSubGroup = (subGroupId: string, updatedSubGroup: FilterGroup) => {
    onChange({
      ...group,
      subGroups: group.subGroups?.map(sg => sg.id === subGroupId ? updatedSubGroup : sg) || [],
    });
  };

  const deleteSubGroup = (subGroupId: string) => {
    onChange({
      ...group,
      subGroups: group.subGroups?.filter(sg => sg.id !== subGroupId) || [],
    });
  };

  return (
    <Card
      sx={{
        ml: level * 2,
        mb: 2,
        border: 1,
        borderColor: level === 0 ? 'primary.main' : 'divider',
        borderRadius: 2,
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              size="small"
              value={group.name}
              onChange={(e) => onChange({ ...group, name: e.target.value })}
              placeholder="Group name"
              variant="outlined"
            />
            
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel>Logic</InputLabel>
              <Select
                value={group.logic}
                onChange={(e) => onChange({ ...group, logic: e.target.value as 'AND' | 'OR' })}
              >
                <MenuItem value="AND">AND</MenuItem>
                <MenuItem value="OR">OR</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Add condition">
              <IconButton size="small" onClick={addCondition}>
                <Add />
              </IconButton>
            </Tooltip>
            {level < 3 && (
              <Tooltip title="Add sub-group">
                <Button size="small" onClick={addSubGroup}>
                  Add Group
                </Button>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete group">
                <IconButton size="small" onClick={onDelete} color="error">
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
      />
      
      <CardContent>
        {/* Conditions */}
        <Box sx={{ mb: 2 }}>
          {group.conditions.map((condition, index) => (
            <Box key={condition.id} sx={{ mb: 2 }}>
              {index > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                  <Chip
                    label={group.logic}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}
              <FilterConditionBuilder
                condition={condition}
                fields={fields}
                onChange={(updatedCondition) => updateCondition(condition.id, updatedCondition)}
                onDelete={() => deleteCondition(condition.id)}
              />
            </Box>
          ))}
        </Box>

        {/* Sub-groups */}
        {group.subGroups && group.subGroups.length > 0 && (
          <Box>
            {group.subGroups.map((subGroup, index) => (
              <Box key={subGroup.id}>
                {(group.conditions.length > 0 || index > 0) && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <Chip
                      label={group.logic}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                )}
                <FilterGroupBuilder
                  group={subGroup}
                  fields={fields}
                  level={level + 1}
                  onChange={(updatedSubGroup) => updateSubGroup(subGroup.id, updatedSubGroup)}
                  onDelete={() => deleteSubGroup(subGroup.id)}
                />
              </Box>
            ))}
          </Box>
        )}

        {group.conditions.length === 0 && (!group.subGroups || group.subGroups.length === 0) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No conditions defined
            </Typography>
            <Button variant="outlined" onClick={addCondition}>
              Add First Condition
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const FilterTemplates: React.FC<FilterTemplatesProps> = ({
  templates,
  onLoad,
  onDelete,
  onSave,
}) => {
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');
  const [templateDescription, setTemplateDescription] = React.useState('');
  const [templateCategory, setTemplateCategory] = React.useState('');
  const [templateTags, setTemplateTags] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      onSave({
        name: templateName,
        description: templateDescription,
        category: templateCategory || 'General',
        filterGroup: {} as FilterGroup, // This would be passed from parent
        isPublic,
        createdBy: 'current-user',
        tags: templateTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      });
      
      setSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('');
      setTemplateTags('');
      setIsPublic(false);
    }
  };

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Filter Templates</Typography>
        <Button
          startIcon={<Save />}
          variant="contained"
          onClick={() => setSaveDialogOpen(true)}
        >
          Save Current Filter
        </Button>
      </Box>

      <List>
        {templates.map((template) => (
          <ListItem key={template.id} divider>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{template.name}</Typography>
                  <Chip label={template.category} size="small" variant="outlined" />
                  {template.isPublic && (
                    <Chip label="Public" size="small" color="success" />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {template.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Used {template.usageCount} times
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      • Created by {template.createdBy}
                    </Typography>
                  </Box>
                  {template.tags.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      {template.tags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="filled"
                          sx={{ mr: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              }
            />
            
            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Load template">
                  <IconButton size="small" onClick={() => onLoad(template)}>
                    <FilterList />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy template">
                  <IconButton size="small">
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share template">
                  <IconButton size="small">
                    <Share />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete template">
                  <IconButton size="small" onClick={() => onDelete(template.id)} color="error">
                    <Delete />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {templates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No saved templates
          </Typography>
        </Box>
      )}

      {/* Save Template Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Filter Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select category</em>
                  </MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="Security">Security</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tags"
                value={templateTags}
                onChange={(e) => setTemplateTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                helperText="Separate tags with commas"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                }
                label="Make this template public"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={!templateName.trim()}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  fields,
  initialFilter,
  templates = [],
  onFilterChange,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
}) => {
  const [filter, setFilter] = React.useState<FilterGroup>(
    initialFilter || {
      id: 'root',
      name: 'Main Filter',
      logic: 'AND',
      conditions: [],
      subGroups: [],
    }
  );

  const [showTemplates, setShowTemplates] = React.useState(false);

  React.useEffect(() => {
    onFilterChange?.(filter);
  }, [filter, onFilterChange]);

  const handleLoadTemplate = (template: FilterTemplate) => {
    setFilter(template.filterGroup);
    onLoadTemplate?.(template);
    setShowTemplates(false);
  };

  const handleSaveTemplate = (templateData: Omit<FilterTemplate, 'id' | 'createdAt' | 'usageCount'>) => {
    onSaveTemplate?.({
      ...templateData,
      filterGroup: filter,
    });
  };

  const clearFilter = () => {
    setFilter({
      id: 'root',
      name: 'Main Filter',
      logic: 'AND',
      conditions: [],
      subGroups: [],
    });
  };

  const hasConditions = filter.conditions.length > 0 || (filter.subGroups && filter.subGroups.length > 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Advanced Filter Builder</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            Templates
          </Button>
          <Button
            variant="outlined"
            onClick={clearFilter}
            disabled={!hasConditions}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {/* Templates Panel */}
      {showTemplates && (
        <Accordion expanded sx={{ mb: 3 }}>
          <AccordionSummary>
            <Typography variant="h6">Filter Templates</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FilterTemplates
              templates={templates}
              onLoad={handleLoadTemplate}
              onDelete={onDeleteTemplate || (() => {})}
              onSave={handleSaveTemplate}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Filter Builder */}
      <FilterGroupBuilder
        group={filter}
        fields={fields}
        level={0}
        onChange={setFilter}
      />

      {/* Filter Summary */}
      {hasConditions && (
        <Card sx={{ mt: 3 }}>
          <CardHeader title="Filter Summary" />
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              This filter will match items where:
            </Typography>
            <Box sx={{ mt: 1, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {generateFilterSummary(filter)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// Helper function to generate human-readable filter summary
const generateFilterSummary = (group: FilterGroup, level: number = 0): string => {
  const indent = '  '.repeat(level);
  let summary = '';

  if (group.conditions.length > 0) {
    const conditionSummaries = group.conditions.map(condition => {
      const operator = condition.operator.replace(/([A-Z])/g, ' $1').toLowerCase();
      let valueStr = '';
      
      if (condition.operator === 'between' && Array.isArray(condition.value)) {
        valueStr = `${condition.value[0]} and ${condition.value[1]}`;
      } else if (Array.isArray(condition.value)) {
        valueStr = condition.value.join(', ');
      } else {
        valueStr = String(condition.value);
      }
      
      return `${condition.field} ${operator} ${valueStr}`;
    });

    summary += conditionSummaries.join(` ${group.logic} `);
  }

  if (group.subGroups && group.subGroups.length > 0) {
    const subGroupSummaries = group.subGroups.map(subGroup => 
      `(${generateFilterSummary(subGroup, level + 1)})`
    );
    
    if (summary) {
      summary += ` ${group.logic} `;
    }
    summary += subGroupSummaries.join(` ${group.logic} `);
  }

  return summary;
};