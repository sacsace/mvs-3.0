import React from 'react';
import { Card, CardContent, Chip, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { mvsBodyCardSx, mvsSearchFieldSx } from '../../theme/mvsLayout';
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

  return (
    <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
      <CardContent sx={{ py: '12px !important', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {canSelectCompany ? (
          <FormControl size="small" sx={{ minWidth: 240, ...mvsSearchFieldSx }}>
            <InputLabel>{t('accountingScope.company')}</InputLabel>
            <Select
              label={t('accountingScope.company')}
              value={selectedCompanyId}
              onChange={(e) => onChangeCompany(Number(e.target.value))}
            >
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
