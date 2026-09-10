import React from 'react';
import { Box, Typography } from '@mui/material';

export type PersonalRecordField = {
  label: string;
  value: string;
};

export type PersonalRecordListItem = {
  title: string;
  subtitle?: string;
  body?: string;
};

export type PersonalRecordSection = {
  title: string;
  fields?: PersonalRecordField[];
  items?: PersonalRecordListItem[];
};

export type EmployeePersonalRecordProps = {
  documentTitle: string;
  companyName: string;
  companyLogoUrl?: string | null;
  companyContact?: string;
  photoUrl?: string | null;
  photoAlt?: string;
  employeeName: string;
  generatedAtLabel: string;
  generatedAt: string;
  sections: PersonalRecordSection[];
};

const BORDER = '#1A1A1A';
const GRID = '#B4B4B4';
const LABEL_BG = '#F3F3F3';
const SECTION_BG = '#C6EFCE';
const HEADER_BG = '#E8F5E9';

function chunkPairs<T>(arr: T[], size = 2): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const EmployeePersonalRecordContent = React.forwardRef<HTMLDivElement, EmployeePersonalRecordProps>(
  function EmployeePersonalRecordContent(
    {
      documentTitle,
      companyName,
      companyLogoUrl,
      companyContact,
      photoUrl,
      photoAlt,
      employeeName,
      generatedAtLabel,
      generatedAt,
      sections,
    },
    ref
  ) {
    const initial = String(employeeName || '?').trim().charAt(0).toUpperCase() || '?';

    return (
      <Box
        ref={ref}
        sx={{
          bgcolor: '#FFFFFF',
          color: '#111',
          width: '100%',
          boxSizing: 'border-box',
          p: 2,
          fontFamily: '"Noto Sans KR", "Segoe UI", Arial, sans-serif',
        }}
      >
        <Box
          sx={{
            border: `2px solid ${BORDER}`,
            overflow: 'hidden',
          }}
        >
          {/* 문서 헤더 — 세로(A4) 양식: 회사+사진 / 제목 밴드 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: `1px solid ${BORDER}`,
              bgcolor: HEADER_BG,
            }}
          >
            <Box
              sx={{
                flex: 1,
                px: 1.5,
                py: 1.1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              {companyLogoUrl ? (
                <Box
                  component="img"
                  src={companyLogoUrl}
                  alt={companyName}
                  sx={{
                    maxHeight: 48,
                    maxWidth: 160,
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : null}
              <Box sx={{ minWidth: 0, width: '100%' }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {companyName || '—'}
                </Typography>
                {companyContact ? (
                  <Typography sx={{ fontSize: '0.68rem', color: '#444', lineHeight: 1.35, mt: 0.25 }}>
                    {companyContact}
                  </Typography>
                ) : null}
              </Box>
            </Box>

            {/* 증명사진 칸 */}
            <Box
              sx={{
                width: 104,
                borderLeft: `1px solid ${BORDER}`,
                bgcolor: '#FFF',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  px: 0.5,
                  py: 0.3,
                  borderBottom: `1px solid ${GRID}`,
                  bgcolor: LABEL_BG,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#333' }}>
                  PHOTO
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0.6,
                  minHeight: 128,
                }}
              >
                {photoUrl ? (
                  <Box
                    component="img"
                    src={photoUrl}
                    alt={photoAlt || employeeName}
                    sx={{
                      width: '100%',
                      height: 126,
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      border: `1px solid ${GRID}`,
                      display: 'block',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: 126,
                      border: `1px dashed ${GRID}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#FAFAFA',
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: '#888',
                    }}
                  >
                    {initial}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              px: 1.25,
              py: 1,
              borderBottom: `1px solid ${BORDER}`,
              bgcolor: '#FFFFFF',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '1.4rem',
                letterSpacing: '0.12em',
                lineHeight: 1.2,
              }}
            >
              {documentTitle}
            </Typography>
          </Box>

          {/* 본문 섹션 */}
          {sections.map((section) => {
            const fields = (section.fields || []).filter((f) => String(f.value || '').trim());
            const items = (section.items || []).filter((it) => String(it.title || '').trim());
            if (!fields.length && !items.length) return null;

            return (
              <Box key={section.title}>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.55,
                    bgcolor: SECTION_BG,
                    borderTop: `1px solid ${BORDER}`,
                    borderBottom: `1px solid ${GRID}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.02em' }}>
                    {section.title}
                  </Typography>
                </Box>

                {fields.length > 0 ? (
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <Box component="tbody">
                      {chunkPairs(fields, 2).map((pair, rowIdx) => (
                        <Box component="tr" key={`${section.title}-r${rowIdx}`}>
                          {pair.map((field) => (
                            <React.Fragment key={`${section.title}-${field.label}`}>
                              <Box
                                component="td"
                                sx={{
                                  width: '16%',
                                  border: `1px solid ${GRID}`,
                                  bgcolor: LABEL_BG,
                                  px: 1,
                                  py: 0.7,
                                  verticalAlign: 'middle',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#333',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {field.label}
                              </Box>
                              <Box
                                component="td"
                                sx={{
                                  width: '34%',
                                  border: `1px solid ${GRID}`,
                                  px: 1,
                                  py: 0.7,
                                  verticalAlign: 'middle',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: '#111',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {field.value}
                              </Box>
                            </React.Fragment>
                          ))}
                          {pair.length === 1 ? (
                            <>
                              <Box
                                component="td"
                                sx={{
                                  width: '16%',
                                  border: `1px solid ${GRID}`,
                                  bgcolor: LABEL_BG,
                                }}
                              />
                              <Box
                                component="td"
                                sx={{
                                  width: '34%',
                                  border: `1px solid ${GRID}`,
                                }}
                              />
                            </>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : null}

                {items.length > 0 ? (
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <Box component="tbody">
                      {items.map((item, idx) => (
                        <Box component="tr" key={`${section.title}-i${idx}`}>
                          <Box
                            component="td"
                            sx={{
                              width: '8%',
                              border: `1px solid ${GRID}`,
                              bgcolor: LABEL_BG,
                              px: 0.75,
                              py: 0.7,
                              textAlign: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              verticalAlign: 'top',
                            }}
                          >
                            {idx + 1}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              border: `1px solid ${GRID}`,
                              px: 1,
                              py: 0.7,
                              verticalAlign: 'top',
                            }}
                          >
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.35 }}>
                              {item.title}
                            </Typography>
                            {item.subtitle ? (
                              <Typography sx={{ fontSize: '0.7rem', color: '#555', mt: 0.2, lineHeight: 1.35 }}>
                                {item.subtitle}
                              </Typography>
                            ) : null}
                            {item.body ? (
                              <Typography sx={{ fontSize: '0.72rem', color: '#222', mt: 0.35, lineHeight: 1.4 }}>
                                {item.body}
                              </Typography>
                            ) : null}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : null}
              </Box>
            );
          })}

          {/* 하단 */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 1.25,
              py: 0.85,
              borderTop: `1px solid ${BORDER}`,
              bgcolor: '#FAFAFA',
            }}
          >
            <Typography sx={{ fontSize: '0.68rem', color: '#555' }}>
              {generatedAtLabel}: {generatedAt}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#555' }}>
              {employeeName}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }
);

export default EmployeePersonalRecordContent;
