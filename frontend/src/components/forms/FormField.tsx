import React from 'react';
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Autocomplete,
  Chip,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CalendarToday,
  AccessTime,
} from '@mui/icons-material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { Controller, useFormContext } from 'react-hook-form';

interface BaseFieldProps {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
}

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel';
  multiline?: boolean;
  rows?: number;
  maxRows?: number;
  placeholder?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

interface SelectFieldProps extends BaseFieldProps {
  options: Array<{ value: any; label: string; disabled?: boolean }>;
  multiple?: boolean;
  native?: boolean;
}

interface AutocompleteFieldProps extends BaseFieldProps {
  options: Array<{ value: any; label: string; disabled?: boolean }>;
  multiple?: boolean;
  freeSolo?: boolean;
  loading?: boolean;
}

interface CheckboxFieldProps extends Omit<BaseFieldProps, 'variant'> {
  color?: 'primary' | 'secondary' | 'default';
}

interface RadioFieldProps extends BaseFieldProps {
  options: Array<{ value: any; label: string; disabled?: boolean }>;
  row?: boolean;
}

interface SwitchFieldProps extends Omit<BaseFieldProps, 'variant'> {
  color?: 'primary' | 'secondary' | 'default';
}

interface DateFieldProps extends BaseFieldProps {
  type: 'date' | 'time' | 'datetime';
  minDate?: Date;
  maxDate?: Date;
}

// Text Field Component
export const FormTextField: React.FC<TextFieldProps> = ({
  name,
  label,
  helperText,
  type = 'text',
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  variant = 'outlined',
  multiline = false,
  rows,
  maxRows,
  placeholder,
  startAdornment,
  endAdornment,
}) => {
  const { control, formState: { errors } } = useFormContext();
  const [showPassword, setShowPassword] = React.useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const passwordAdornment = isPassword ? (
    <InputAdornment position="end">
      <IconButton
        aria-label="toggle password visibility"
        onClick={() => setShowPassword(!showPassword)}
        edge="end"
      >
        {showPassword ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  ) : endAdornment;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          label={label}
          type={inputType}
          error={!!error}
          helperText={error?.message || helperText}
          required={required}
          disabled={disabled}
          fullWidth={fullWidth}
          size={size}
          variant={variant}
          multiline={multiline}
          rows={rows}
          maxRows={maxRows}
          placeholder={placeholder}
          InputProps={{
            startAdornment,
            endAdornment: passwordAdornment,
          }}
        />
      )}
    />
  );
};

// Select Field Component
export const FormSelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  helperText,
  options,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  variant = 'outlined',
  multiple = false,
  native = false,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl
          fullWidth={fullWidth}
          size={size}
          variant={variant}
          error={!!error}
          disabled={disabled}
        >
          {label && <FormLabel required={required}>{label}</FormLabel>}
          <Select
            {...field}
            multiple={multiple}
            native={native}
            renderValue={multiple ? (selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => {
                  const option = options.find(opt => opt.value === value);
                  return (
                    <Chip key={value} label={option?.label || value} size="small" />
                  );
                })}
              </Box>
            ) : undefined}
          >
            {options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(error?.message || helperText) && (
            <FormHelperText>{error?.message || helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};

// Autocomplete Field Component
export const FormAutocompleteField: React.FC<AutocompleteFieldProps> = ({
  name,
  label,
  helperText,
  options,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  multiple = false,
  freeSolo = false,
  loading = false,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          options={options}
          getOptionLabel={(option) => 
            typeof option === 'string' ? option : option.label
          }
          isOptionEqualToValue={(option, value) => 
            option.value === value?.value
          }
          multiple={multiple}
          freeSolo={freeSolo}
          loading={loading}
          disabled={disabled}
          fullWidth={fullWidth}
          size={size}
          onChange={(_, value) => field.onChange(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              error={!!error}
              helperText={error?.message || helperText}
              required={required}
              variant="outlined"
            />
          )}
          renderTags={multiple ? (value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={typeof option === 'string' ? option : option.label}
                {...getTagProps({ index })}
                key={index}
              />
            ))
          : undefined}
        />
      )}
    />
  );
};

// Checkbox Field Component
export const FormCheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  helperText,
  required = false,
  disabled = false,
  color = 'primary',
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} disabled={disabled}>
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={field.value || false}
                color={color}
                required={required}
              />
            }
            label={label}
          />
          {(error?.message || helperText) && (
            <FormHelperText>{error?.message || helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};

// Radio Field Component
export const FormRadioField: React.FC<RadioFieldProps> = ({
  name,
  label,
  helperText,
  options,
  required = false,
  disabled = false,
  row = false,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} disabled={disabled}>
          {label && <FormLabel required={required}>{label}</FormLabel>}
          <RadioGroup {...field} row={row}>
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
                disabled={option.disabled}
              />
            ))}
          </RadioGroup>
          {(error?.message || helperText) && (
            <FormHelperText>{error?.message || helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};

// Switch Field Component
export const FormSwitchField: React.FC<SwitchFieldProps> = ({
  name,
  label,
  helperText,
  required = false,
  disabled = false,
  color = 'primary',
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} disabled={disabled}>
          <FormControlLabel
            control={
              <Switch
                {...field}
                checked={field.value || false}
                color={color}
                required={required}
              />
            }
            label={label}
          />
          {(error?.message || helperText) && (
            <FormHelperText>{error?.message || helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};

// Date/Time Field Component
export const FormDateField: React.FC<DateFieldProps> = ({
  name,
  label,
  helperText,
  type,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  minDate,
  maxDate,
}) => {
  const { control } = useFormContext();

  const getPickerComponent = () => {
    switch (type) {
      case 'date':
        return DatePicker;
      case 'time':
        return TimePicker;
      case 'datetime':
        return DateTimePicker;
      default:
        return DatePicker;
    }
  };

  const PickerComponent = getPickerComponent();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <PickerComponent
          {...field}
          label={label}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth={fullWidth}
              size={size}
              error={!!error}
              helperText={error?.message || helperText}
              required={required}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <InputAdornment position="end">
                    {type === 'time' ? <AccessTime /> : <CalendarToday />}
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
};