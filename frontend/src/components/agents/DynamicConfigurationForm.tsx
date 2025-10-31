import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface ConfigField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'array' | 'object' | 'password';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: any;
  dependencies?: string[];
  conditional?: {
    field: string;
    value: any;
  };
}

interface ConfigSchema {
  fields: ConfigField[];
  version: string;
  agentType: string;
}

interface DynamicConfigurationFormProps {
  schema: ConfigSchema;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onValidate?: (values: Record<string, any>) => Promise<Record<string, string>>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export const DynamicConfigurationForm: React.FC<DynamicConfigurationFormProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  onValidate,
  isLoading = false,
  readOnly = false
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Build dynamic validation schema
  const buildValidationSchema = () => {
    const schemaObject: Record<string, any> = {};
    
    schema.fields.forEach(field => {
      let fieldSchema: any;
      
      switch (field.type) {
        case 'text':
        case 'password':
          fieldSchema = yup.string();
          break;
        case 'number':
          fieldSchema = yup.number();
          break;
        case 'boolean':
          fieldSchema = yup.boolean();
          break;
        case 'select':
          fieldSchema = yup.string().oneOf(field.options?.map(o => o.value));
          break;
        case 'array':
          fieldSchema = yup.array();
          break;
        case 'object':
          fieldSchema = yup.object();
          break;
        default:
          fieldSchema = yup.mixed();
      }
      
      if (field.required) {
        fieldSchema = fieldSchema.required(`${field.label} is required`);
      }
      
      if (field.validation) {
        // Apply custom validation rules
        Object.keys(field.validation).forEach(rule => {
          const value = field.validation[rule];
          switch (rule) {
            case 'min':
              fieldSchema = fieldSchema.min(value);
              break;
            case 'max':
              fieldSchema = fieldSchema.max(value);
              break;
            case 'minLength':
              fieldSchema = fieldSchema.min(value);
              break;
            case 'maxLength':
              fieldSchema = fieldSchema.max(value);
              break;
            case 'pattern':
              fieldSchema = fieldSchema.matches(new RegExp(value));
              break;
          }
        });
      }
      
      schemaObject[field.name] = fieldSchema;
    });
    
    return yup.object().shape(schemaObject);
  };

  const validationSchema = buildValidationSchema();
  
  const { control, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: { ...getDefaultValues(), ...initialValues },
    mode: 'onChange'
  });

  function getDefaultValues() {
    const defaults: Record<string, any> = {};
    schema.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      }
    });
    return defaults;
  }

  const watchedValues = watch();

  // Real-time validation
  useEffect(() => {
    if (onValidate) {
      const validateAsync = async () => {
        setIsValidating(true);
        try {
          const errors = await onValidate(watchedValues);
          setValidationErrors(errors);
        } catch (error) {
          console.error('Validation error:', error);
        } finally {
          setIsValidating(false);
        }
      };

      const timeoutId = setTimeout(validateAsync, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [watchedValues, onValidate]);

  const shouldShowField = (field: ConfigField) => {
    if (!field.conditional) return true;
    
    const conditionValue = watchedValues[field.conditional.field];
    return conditionValue === field.conditional.value;
  };

  const renderField = (field: ConfigField) => {
    if (!shouldShowField(field)) return null;

    const error = errors[field.name] || validationErrors[field.name];
    const isFieldLoading = isValidating && field.name in validationErrors;

    switch (field.type) {
      case 'text':
      case 'password':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-3">
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </label>
                <input
                  {...formField}
                  type={field.type}
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  disabled={readOnly || isLoading}
                  placeholder={field.description}
                />
                {field.description && (
                  <div className="form-text">{field.description}</div>
                )}
                {error && (
                  <div className="invalid-feedback">{error.message || error}</div>
                )}
                {isFieldLoading && (
                  <div className="form-text text-info">
                    <span className="spinner-border spinner-border-sm me-1" />
                    Validating...
                  </div>
                )}
              </div>
            )}
          />
        );

      case 'number':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-3">
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </label>
                <input
                  {...formField}
                  type="number"
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  disabled={readOnly || isLoading}
                  placeholder={field.description}
                  onChange={(e) => formField.onChange(Number(e.target.value))}
                />
                {field.description && (
                  <div className="form-text">{field.description}</div>
                )}
                {error && (
                  <div className="invalid-feedback">{error.message || error}</div>
                )}
              </div>
            )}
          />
        );

      case 'boolean':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-3">
                <div className="form-check">
                  <input
                    {...formField}
                    type="checkbox"
                    className={`form-check-input ${error ? 'is-invalid' : ''}`}
                    disabled={readOnly || isLoading}
                    checked={formField.value || false}
                  />
                  <label className="form-check-label">
                    {field.label}
                    {field.required && <span className="text-danger">*</span>}
                  </label>
                </div>
                {field.description && (
                  <div className="form-text">{field.description}</div>
                )}
                {error && (
                  <div className="invalid-feedback d-block">{error.message || error}</div>
                )}
              </div>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className="mb-3">
                <label className="form-label">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </label>
                <select
                  {...formField}
                  className={`form-select ${error ? 'is-invalid' : ''}`}
                  disabled={readOnly || isLoading}
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {field.description && (
                  <div className="form-text">{field.description}</div>
                )}
                {error && (
                  <div className="invalid-feedback">{error.message || error}</div>
                )}
              </div>
            )}
          />
        );

      case 'array':
        return <ArrayField key={field.name} field={field} control={control} error={error} readOnly={readOnly} />;

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="dynamic-configuration-form">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                {schema.agentType} Configuration
                <span className="badge bg-secondary ms-2">v{schema.version}</span>
              </h5>
            </div>
            <div className="card-body">
              {schema.fields.map(field => (
                <div key={field.name}>
                  {renderField(field)}
                </div>
              ))}
            </div>
            <div className="card-footer">
              <div className="d-flex justify-content-between">
                <div>
                  {isValidating && (
                    <span className="text-info">
                      <span className="spinner-border spinner-border-sm me-1" />
                      Validating configuration...
                    </span>
                  )}
                </div>
                <div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={readOnly || isLoading || isValidating}
                  >
                    {isLoading && <span className="spinner-border spinner-border-sm me-1" />}
                    {readOnly ? 'View Only' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

// Array field component for handling dynamic arrays
const ArrayField: React.FC<{
  field: ConfigField;
  control: any;
  error: any;
  readOnly: boolean;
}> = ({ field, control, error, readOnly }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.name
  });

  return (
    <div className="mb-3">
      <label className="form-label">
        {field.label}
        {field.required && <span className="text-danger">*</span>}
      </label>
      
      {fields.map((item, index) => (
        <div key={item.id} className="input-group mb-2">
          <Controller
            name={`${field.name}.${index}`}
            control={control}
            render={({ field: formField }) => (
              <input
                {...formField}
                type="text"
                className="form-control"
                disabled={readOnly}
                placeholder={`${field.label} ${index + 1}`}
              />
            )}
          />
          {!readOnly && (
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => remove(index)}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      
      {!readOnly && (
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => append('')}
        >
          Add {field.label}
        </button>
      )}
      
      {field.description && (
        <div className="form-text">{field.description}</div>
      )}
      {error && (
        <div className="invalid-feedback d-block">{error.message || error}</div>
      )}
    </div>
  );
};