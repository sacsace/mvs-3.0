import type { SxProps, Theme } from '@mui/material/styles';

export const payrollDataGridSx: SxProps<Theme> = {
  border: 'none',
  borderRadius: 0,
  fontSize: '0.8125rem',
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: 'grey.200',
    borderBottom: '1px solid',
    borderColor: 'divider',
    fontSize: '0.75rem',
    minHeight: 56
  },
  '& .MuiDataGrid-columnHeader': {
    backgroundColor: 'grey.200',
    minHeight: '56px !important',
    maxHeight: 'none !important',
    py: 0.5,
    alignItems: 'center',
    '&:focus, &:focus-within': {
      backgroundColor: 'grey.200'
    }
  },
  '& .MuiDataGrid-columnHeaderTitleContainer': {
    alignItems: 'center',
    justifyContent: 'center'
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    whiteSpace: 'pre-line',
    lineHeight: 1.2,
    textAlign: 'center',
    fontSize: '0.7rem',
    overflow: 'visible'
  },
  '& .MuiDataGrid-cell': { py: 0.25 },
  '& .MuiDataGrid-row': { maxHeight: 'none' },
  '& .MuiDataGrid-cell.payroll-col-unpaid, & .MuiDataGrid-columnHeader.payroll-col-unpaid': {
    backgroundColor: 'rgba(25, 118, 210, 0.08)'
  },
  '& .MuiDataGrid-cell.payroll-col-sum, & .MuiDataGrid-columnHeader.payroll-col-sum': {
    backgroundColor: 'rgba(237, 108, 2, 0.1)'
  },
  '& .MuiDataGrid-cell.payroll-col-sum': {
    fontWeight: 700
  },
  '& .MuiDataGrid-cell.payroll-col-net, & .MuiDataGrid-columnHeader.payroll-col-net': {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderLeft: '3px solid',
    borderLeftColor: 'success.main'
  },
  '& .MuiDataGrid-cell.payroll-col-net': {
    fontWeight: 700,
    color: 'error.main'
  },
  '& .MuiDataGrid-cell.payroll-col-net .MuiInputBase-input': {
    color: 'error.main'
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid',
    borderColor: 'divider'
  }
};
