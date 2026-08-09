import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { getUploadUrl } from '../../utils/uploadUrl';

type AuthMediaProps = {
  src?: string | null;
  alt?: string;
  sx?: SxProps<Theme>;
  style?: React.CSSProperties;
  className?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

const AuthMedia: React.FC<AuthMediaProps> = ({ src, alt = '', sx, style, className, onError }) => {
  const resolved = getUploadUrl(src);
  if (!resolved) return null;
  return (
    <Box
      component="img"
      src={resolved}
      alt={alt}
      data-photo-preview={resolved}
      data-photo-preview-alt={alt}
      sx={sx}
      style={style}
      className={className}
      onError={onError}
    />
  );
};

export default AuthMedia;
