import React from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import {
  useForm,
  FormProvider,
  SubmitHandler,
  DefaultValues,
  FieldValues,
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface FormProps<T extends FieldValues> {
  children: React.ReactNode;
  onSubmit: SubmitHandler<T>;
  defaultValues?: DefaultValues<T>;
  validationSchema?: yup.ObjectSchema<any>;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
  success?: string;
  disabled?: boolean;
  showButtons?: boolean;
  buttonAlignment?: 'left' | 'center' | 'right' | 'space-between';
  paper?: boolean;
  elevation?: number;
  maxWidth?: number | string;
  spacing?: number;
  resetOnSubmit?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function Form<T extends FieldValues>({
  children,
  onSubmit,
  defaultValues,
  validationSchema,
  title,
  subtitle,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  loading = false,
  error,
  success,
  disabled = false,
  showButtons = true,
  buttonAlignment = 'right',
  paper = false,
  elevation = 1,
  maxWidth,
  spacing = 3,
  resetOnSubmit = false,
  validateOnChange = false,
  validateOnBlur = true,
}: FormProps<T>) {
  const theme = useTheme();

  const methods = useForm<T>({
    defaultValues,
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    mode: validateOnChange ? 'onChange' : validateOnBlur ? 'onBlur' : 'onSubmit',
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, isValid },
  } = methods;

  const handleFormSubmit: SubmitHandler<T> = async (data) => {
    try {
      await onSubmit(data);
      if (resetOnSubmit) {
        reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      reset();
    }
  };

  const getButtonAlignment = () => {
    switch (buttonAlignment) {
      case 'left':
        return 'flex-start';
      case 'center':
        return 'center';
      case 'right':
        return 'flex-end';
      case 'space-between':
        return 'space-between';
      default:
        return 'flex-end';
    }
  };

  const formContent = (
    <FormProvider {...methods}>
      <Box
        component="form"
        onSubmit={handleSubmit(handleFormSubmit)}
        sx={{
          maxWidth,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Loading Overlay */}
        {(loading || isSubmitting) && (
          <LoadingSpinner
            overlay
            message={loading ? 'Loading...' : 'Submitting...'}
          />
        )}

        <Stack spacing={spacing}>
          {/* Header */}
          {(title || subtitle) && (
            <Box>
              {title && (
                <Typography variant="h5" component="h2" gutterBottom>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" variant="filled">
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert severity="success" variant="filled">
              {success}
            </Alert>
          )}

          {/* Form Fields */}
          <Box sx={{ opacity: disabled ? 0.6 : 1 }}>
            {children}
          </Box>

          {/* Action Buttons */}
          {showButtons && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: getButtonAlignment(),
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                {buttonAlignment === 'space-between' && onCancel && (
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={loading || isSubmitting || disabled}
                  >
                    {cancelLabel}
                  </Button>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {buttonAlignment !== 'space-between' && onCancel && (
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={loading || isSubmitting || disabled}
                    >
                      {cancelLabel}
                    </Button>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      loading ||
                      isSubmitting ||
                      disabled ||
                      (validationSchema && !isValid)
                    }
                    sx={{ minWidth: 120 }}
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size={20} color="inherit" />
                    ) : (
                      submitLabel
                    )}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Stack>
      </Box>
    </FormProvider>
  );

  if (paper) {
    return (
      <Paper
        elevation={elevation}
        sx={{
          p: 3,
          maxWidth,
          width: '100%',
        }}
      >
        {formContent}
      </Paper>
    );
  }

  return formContent;
}

// Form Section Component for organizing complex forms
export const FormSection: React.FC<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}> = ({
  title,
  subtitle,
  children,
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <Box>
      {title && (
        <Box
          sx={{
            mb: 2,
            cursor: collapsible ? 'pointer' : 'default',
          }}
          onClick={collapsible ? () => setExpanded(!expanded) : undefined}
        >
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      
      {(!collapsible || expanded) && (
        <Box sx={{ pl: title ? 2 : 0 }}>
          {children}
        </Box>
      )}
    </Box>
  );
};

// Form Grid Component for responsive layouts
export const FormGrid: React.FC<{
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  breakpoints?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}> = ({
  children,
  columns = 2,
  spacing = 2,
  breakpoints,
}) => {
  const { Grid } = require('@mui/material');

  const getColumns = (breakpoint: string) => {
    if (breakpoints && breakpoints[breakpoint as keyof typeof breakpoints]) {
      return 12 / breakpoints[breakpoint as keyof typeof breakpoints]!;
    }
    return 12 / columns;
  };

  return (
    <Grid container spacing={spacing}>
      {React.Children.map(children, (child, index) => (
        <Grid
          item
          xs={getColumns('xs')}
          sm={getColumns('sm')}
          md={getColumns('md')}
          lg={getColumns('lg')}
          xl={getColumns('xl')}
          key={index}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};