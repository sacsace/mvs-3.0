import React, { useMemo } from 'react';
import { Autocomplete, Card, CardContent, Chip, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { mvsBodyCardSx, mvsOutlinedLabelProps, mvsSearchFieldSx } from '../../theme/mvsLayout';
import type { AccountingCompany } from '../../hooks/useAccountingCompany';

type Props = {
  canSelectCompany: boolean;
  companies: AccountingCompany[];
  selectedCompanyId: number | '';
  selectedCompanyName: string;
  onChangeCompany: (companyId: number) => void;
};

const AccountingCompanyBar: React.FC<Props> = ({
  canSelectCompany,
  companies,
  selectedCompanyId,
  selectedCompanyName,
  onChangeCompany,
}) => {
  const { t } = useTranslation();

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );

  return (
    <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
      <CardContent sx={{ py: '12px !important', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {canSelectCompany ? (
          <Autocomplete
            options={companies}
            value={selectedCompany}
            onChange={(_, newValue) => {
              if (newValue?.id) onChangeCompany(newValue.id);
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disableClearable={Boolean(selectedCompany)}
            sx={{ minWidth: 280, width: { xs: '100%', sm: 360 }, ...mvsSearchFieldSx }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={t('accountingScope.company')}
                {...mvsOutlinedLabelProps}
                placeholder={t('accountingScope.searchCompany', { defaultValue: 'Search company' })}
              />
            )}
          />
        ) : (
          selectedCompanyName && (
            <Chip
              label={`${t('accountingScope.company')}: ${selectedCompanyName}`}
              color="primary"
              variant="outlined"
            />
          )
        )}
        <Typography variant="body2" color="text.secondary">
          {t('accountingScope.hint')}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AccountingCompanyBar;
