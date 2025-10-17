import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Language,
  Translate,
  Public,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../i18n';

interface LanguageSelectorProps {
  variant?: 'select' | 'menu';
  showNativeName?: boolean;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'select',
  showNativeName = true,
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    
    // Update document direction for RTL languages
    const selectedLang = supportedLanguages.find(lang => lang.code === languageCode);
    if (selectedLang) {
      document.documentElement.dir = selectedLang.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = languageCode;
    }
    
    // Close menu if using menu variant
    if (variant === 'menu') {
      setAnchorEl(null);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getFlagEmoji = (languageCode: string) => {
    const flags: Record<string, string> = {
      en: '🇺🇸',
      es: '🇪🇸',
      fr: '🇫🇷',
      de: '🇩🇪',
      ja: '🇯🇵',
      zh: '🇨🇳',
      ar: '🇸🇦',
    };
    return flags[languageCode] || '🌐';
  };

  if (variant === 'menu') {
    return (
      <>
        <IconButton
          onClick={handleMenuOpen}
          aria-label="Select language"
          aria-haspopup="true"
          aria-expanded={Boolean(anchorEl)}
        >
          {compact ? (
            <Language />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {getFlagEmoji(currentLanguage.code)}
              </Typography>
              {!compact && (
                <Typography variant="body2">
                  {showNativeName ? currentLanguage.nativeName : currentLanguage.name}
                </Typography>
              )}
            </Box>
          )}
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {supportedLanguages.map((language) => (
            <MenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              selected={language.code === currentLanguage.code}
              sx={{
                direction: language.rtl ? 'rtl' : 'ltr',
                minWidth: 200,
              }}
            >
              <ListItemIcon>
                <Typography variant="body1">
                  {getFlagEmoji(language.code)}
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {language.name}
                    </Typography>
                    {showNativeName && language.nativeName !== language.name && (
                      <Typography variant="caption" color="text.secondary">
                        {language.nativeName}
                      </Typography>
                    )}
                  </Box>
                }
              />
              {language.rtl && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  RTL
                </Typography>
              )}
            </MenuItem>
          ))}
          
          <Divider />
          
          <MenuItem onClick={handleMenuClose} disabled>
            <ListItemIcon>
              <Translate fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="caption" color="text.secondary">
                  Translation powered by i18next
                </Typography>
              }
            />
          </MenuItem>
        </Menu>
      </>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: compact ? 80 : 150 }}>
      <InputLabel id="language-select-label">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Public fontSize="small" />
          {!compact && 'Language'}
        </Box>
      </InputLabel>
      <Select
        labelId="language-select-label"
        value={currentLanguage.code}
        onChange={(e) => handleLanguageChange(e.target.value)}
        label={compact ? '' : 'Language'}
        renderValue={(value) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">
              {getFlagEmoji(value)}
            </Typography>
            {!compact && (
              <Typography variant="body2">
                {showNativeName 
                  ? supportedLanguages.find(lang => lang.code === value)?.nativeName
                  : supportedLanguages.find(lang => lang.code === value)?.name
                }
              </Typography>
            )}
          </Box>
        )}
      >
        {supportedLanguages.map((language) => (
          <MenuItem
            key={language.code}
            value={language.code}
            sx={{
              direction: language.rtl ? 'rtl' : 'ltr',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2">
                {getFlagEmoji(language.code)}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {language.name}
                </Typography>
                {showNativeName && language.nativeName !== language.name && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {language.nativeName}
                  </Typography>
                )}
              </Box>
              {language.rtl && (
                <Typography variant="caption" color="text.secondary">
                  RTL
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};