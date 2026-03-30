import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Autocomplete,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  TaskAlt as TaskAltIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { accountingService, partnerService, companyService } from '../../services/api';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

interface InvoiceItem {
  id?: number;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  tax_amount: number;
  sub_total: number;
  status: string;
  payment_status: string;
  currency: string;
  notes?: string;
  items: InvoiceItem[];
}

interface CompanyInfo {
  id: number;
  name: string;
  business_number?: string;
  gst_numbers?: string[];
  gstNumbers?: string[];
  pan_number?: string;
  ceo_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  company_logo?: string;
  company_seal?: string;
  ceo_signature?: string;
  account_holder_name?: string;
  bank_name?: string;
  bank_address?: string;
  account_number?: string;
  ifsc_code?: string;
}

const RegularInvoice: React.FC = () => {
  const { user } = useStore();
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  const allowedGstRates = [0, 2.5, 6, 9, 20];
  const allowedIgstRates = [0, 5, 12, 18, 40];
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const isInvoicePageMode = isCreating || isEditing || isViewing;
  const tr = (ko: string, en: string) => ((isInvoicePageMode || isEnglish) ? en : ko);
  const [pendingPrintInvoiceId, setPendingPrintInvoiceId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewCustomer, setViewCustomer] = useState<{ name: string; email: string; phone?: string; address?: string; gst?: string; pan?: string }>({
    name: '',
    email: '',
    phone: '',
    address: '',
    gst: '',
    pan: ''
  });
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [issuerCompany, setIssuerCompany] = useState<CompanyInfo | null>(null);
  const [recipientCompanyId, setRecipientCompanyId] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [issuerGst, setIssuerGst] = useState('');
  const [customerGstNumbers, setCustomerGstNumbers] = useState<string[]>([]);
  const invoicePrintRef = useRef<HTMLDivElement | null>(null);
  const createEmptyItem = (): InvoiceItem => ({
    item_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    tax_rate: 18,
    tax_amount: 0,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0
  });

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_gst: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'INR',
    notes: '',
    taxMode: 'overall' as 'overall' | 'item',
    overallCgstRate: 9,
    overallSgstRate: 9,
    overallIgstRate: 0,
    items: [createEmptyItem()] as InvoiceItem[]
  });
  const [filters, setFilters] = useState({
    payment_status: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; invoiceNumber?: string }>({
    open: false,
    id: null,
    invoiceNumber: ''
  });
  const itemNameRefs = useRef<Array<HTMLInputElement | null>>([]);
  const descriptionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const quantityRefs = useRef<Array<HTMLInputElement | null>>([]);
  const unitPriceRefs = useRef<Array<HTMLInputElement | null>>([]);
  const itemsSubtotal = formData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const itemsTaxTotal = formData.items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  const itemsGrandTotal = itemsSubtotal + itemsTaxTotal;
  const generatedInvoiceNumber = useMemo(() => {
    if (invoiceNumber) return invoiceNumber;
    return nextInvoiceNumber || 'Auto-generated';
  }, [invoiceNumber, nextInvoiceNumber]);

  const resolveTaxRates = useCallback((item: InvoiceItem) => {
    if (formData.taxMode === 'overall') {
      const igstRate = formData.overallIgstRate || 0;
      return {
        igstRate,
        cgstRate: igstRate > 0 ? 0 : (formData.overallCgstRate || 0),
        sgstRate: igstRate > 0 ? 0 : (formData.overallSgstRate || 0)
      };
    }
    const igstRate = item.igstRate || 0;
    return {
      igstRate,
      cgstRate: igstRate > 0 ? 0 : (item.cgstRate || 0),
      sgstRate: igstRate > 0 ? 0 : (item.sgstRate || 0)
    };
  }, [formData.taxMode, formData.overallCgstRate, formData.overallSgstRate, formData.overallIgstRate]);

  const updateItemTaxAmount = useCallback((item: InvoiceItem) => {
    const { cgstRate, sgstRate, igstRate } = resolveTaxRates(item);
    const totalRate = cgstRate + sgstRate + igstRate;
    const taxAmount = item.total_price * (totalRate / 100);
    return { ...item, cgstRate, sgstRate, igstRate, tax_rate: totalRate, tax_amount: taxAmount };
  }, [resolveTaxRates]);

  const getDisplayGstRates = (item: InvoiceItem) => {
    let cgstRate = Number(item.cgstRate || 0);
    let sgstRate = Number(item.sgstRate || 0);
    let igstRate = Number(item.igstRate || 0);

    if (cgstRate === 0 && sgstRate === 0 && igstRate === 0) {
      let totalRate = Number(item.tax_rate || 0);
      if (!totalRate && Number(item.total_price || 0) > 0) {
        totalRate = (Number(item.tax_amount || 0) / Number(item.total_price || 0)) * 100;
      }
      if (totalRate > 0) {
        if (igstRate > 0) {
          cgstRate = 0;
          sgstRate = 0;
          igstRate = totalRate;
        } else {
          cgstRate = totalRate / 2;
          sgstRate = totalRate / 2;
          igstRate = 0;
        }
      }
    }

    return { cgstRate, sgstRate, igstRate };
  };

  const itemInputSx = { '& .MuiInputBase-root': { height: 34 } };

  const viewItemsSubtotal = useMemo(() => {
    const items = selectedInvoice?.items || [];
    return items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  }, [selectedInvoice?.items]);

  const viewItemsTaxTotal = useMemo(() => {
    const items = selectedInvoice?.items || [];
    return items.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0);
  }, [selectedInvoice?.items]);

  const viewItemsGrandTotal = viewItemsSubtotal + viewItemsTaxTotal;
  const formatFloorAmount = (value: number) => Math.floor(value).toLocaleString();

  const itemsPerPage = 8;
  const itemPages = useMemo(() => {
    const items = selectedInvoice?.items || [];
    if (items.length === 0) return [[]];
    const pages: InvoiceItem[][] = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
    return pages;
  }, [selectedInvoice?.items]);

  const hasIgstInItems = useMemo(() => {
    const items = selectedInvoice?.items || [];
    return items.some((it) => Number(it.igstRate || 0) > 0);
  }, [selectedInvoice?.items]);

  const uniformGstRate = useMemo(() => {
    const items = selectedInvoice?.items || [];
    if (items.length === 0) return null;
    const rates = items.map((it) => {
      const cgst = Number(it.cgstRate || 0);
      const sgst = Number(it.sgstRate || 0);
      const igst = Number(it.igstRate || 0);
      let totalRate = cgst + sgst + igst;
      if (!totalRate) {
        const totalPrice = Number(it.total_price || 0);
        const taxAmount = Number(it.tax_amount || 0);
        totalRate = Number(it.tax_rate || 0) || (totalPrice > 0 ? (taxAmount / totalPrice) * 100 : 0);
      }
      return Number(totalRate.toFixed(4));
    });
    const isUniform = rates.every((rate) => rate === rates[0]);
    return isUniform ? rates[0] : null;
  }, [selectedInvoice?.items]);

  const computedTaxTotal = useMemo(() => {
    if (uniformGstRate !== null) {
      return (viewItemsSubtotal * uniformGstRate) / 100;
    }
    return viewItemsTaxTotal;
  }, [uniformGstRate, viewItemsSubtotal, viewItemsTaxTotal]);

  const computedGrandTotal = viewItemsSubtotal + computedTaxTotal;

  const displayGrandTotal = useMemo(() => {
    if (uniformGstRate !== null) return computedGrandTotal;
    if (viewItemsGrandTotal) return viewItemsGrandTotal;
    if (selectedInvoice?.total_amount !== undefined && selectedInvoice?.total_amount !== null) {
      return selectedInvoice.total_amount;
    }
    return itemsGrandTotal;
  }, [uniformGstRate, computedGrandTotal, selectedInvoice?.total_amount, viewItemsGrandTotal, itemsGrandTotal]);

  const hasGstInItems = useMemo(() => {
    const items = selectedInvoice?.items || [];
    if (items.length === 0) return false;
    const shouldHide = uniformGstRate !== null;
    if (shouldHide) return false;
    return items.some((it) => {
      const totalRate = Number(it.tax_rate || 0);
      const cgst = Number(it.cgstRate || 0);
      const sgst = Number(it.sgstRate || 0);
      const igst = Number(it.igstRate || 0);
      const taxAmount = Number(it.tax_amount || 0);
      return totalRate > 0 || cgst > 0 || sgst > 0 || igst > 0 || taxAmount > 0;
    });
  }, [selectedInvoice?.items, uniformGstRate]);

  const summaryGridColumns = useMemo(() => {
    if (hasGstInItems) {
      return hasIgstInItems
        ? '6% 50% 10% 6% 10% 6% 6% 6% 10%'
        : '6% 50% 10% 6% 10% 6% 6% 10%';
    }
    return '6% 50% 10% 6% 10% 10%';
  }, [hasGstInItems, hasIgstInItems]);

  const summaryAmountColumn = useMemo(
    () => (hasGstInItems ? (hasIgstInItems ? 9 : 8) : 6),
    [hasGstInItems, hasIgstInItems]
  );

  const summaryLabelColumn = useMemo(
    () => summaryAmountColumn - 1,
    [summaryAmountColumn]
  );

  const summaryColumnSx = useMemo(() => {
    const columns = [
      { width: '6%' },
      { width: '50%' },
      { width: '10%' },
      { width: '6%' },
      { width: '10%' }
    ];
    if (hasGstInItems) {
      columns.push({ width: '6%' }, { width: '6%' });
      if (hasIgstInItems) {
        columns.push({ width: '6%' });
      }
    }
    columns.push({ width: '10%' });
    return columns;
  }, [hasGstInItems, hasIgstInItems]);

  const numberToWordsInr = useCallback((value: number): string => {
    const num = Math.round(Math.abs(value));
    if (num === 0) return 'Zero';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigits = (n: number) => {
      if (n < 20) return ones[n];
      const t = Math.floor(n / 10);
      const o = n % 10;
      return `${tens[t]}${o ? ' ' + ones[o] : ''}`.trim();
    };

    const threeDigits = (n: number) => {
      const h = Math.floor(n / 100);
      const r = n % 100;
      const head = h ? `${ones[h]} Hundred` : '';
      const tail = r ? `${head ? ' ' : ''}${twoDigits(r)}` : head;
      return tail.trim();
    };

    const parts: string[] = [];
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundred = num % 1000;

    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(' ').trim();
  }, []);

  const formatInrWords = useCallback((amount: number) => {
    return `INR ${numberToWordsInr(amount)} Only`;
  }, [numberToWordsInr]);

  const normalizeGstNumbers = useCallback((value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((v) => {
          if (typeof v === 'string') return v;
          return v?.gst_number || v?.gstin || v?.number || '';
        })
        .filter((v: string) => v && v.trim() !== '');
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((v: string) => v && v.trim() !== '');
        }
      } catch {
        // ignore parse error
      }
      return trimmed.includes(',') ? trimmed.split(',').map(v => v.trim()).filter(Boolean) : [trimmed];
    }
    return [];
  }, []);

  const issuerGstNumbers = useMemo(() => {
    const rawValue =
      issuerCompany?.gst_numbers ??
      issuerCompany?.gstNumbers ??
      (issuerCompany as any)?.gst_number ??
      issuerCompany?.business_number;

    return normalizeGstNumbers(rawValue);
  }, [issuerCompany, normalizeGstNumbers]);

  useEffect(() => {
    const loadIssuerCompany = async () => {
      if (!user?.company_id) {
        setIssuerCompany(null);
        return;
      }
      try {
        const response = await companyService.getCompany(Number(user.company_id));
        if (response.success && response.data) {
          const data = response.data;
          let gstNumbers = normalizeGstNumbers(
            data.gst_numbers ?? data.gstNumbers ?? (data as any).gst_number
          );

          try {
            const gstResponse = await companyService.getCompanyGstNumbers(Number(user.company_id));
            if (gstResponse?.success) {
              const directGstNumbers = normalizeGstNumbers(gstResponse.data?.gst_numbers);
              if (directGstNumbers.length > 0) {
                gstNumbers = directGstNumbers;
              }
            }
          } catch (gstError) {
            console.error('?? ?? GST ?? ?? ??:', gstError);
          }

          setIssuerCompany({
            id: data.id,
            name: data.name || data.company_name || '',
            business_number: data.business_number || data.businessNumber || '',
            gst_numbers: gstNumbers,
            gstNumbers,
            pan_number: data.pan_number || data.panNumber || '',
            ceo_name: data.ceo_name || data.ceoName || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            company_logo: data.company_logo || '',
            company_seal: data.company_seal || '',
            ceo_signature: data.ceo_signature || '',
            account_holder_name: data.account_holder_name || data.accountHolderName || '',
            bank_name: data.bank_name || data.bankName || '',
            bank_address: data.bank_address || data.bankAddress || '',
            account_number: data.account_number || data.accountNumber || '',
            ifsc_code: data.ifsc_code || data.ifscCode || ''
          });
        } else {
          setIssuerCompany(null);
        }
      } catch (error) {
        console.error('?? ?? ?? ?? ??:', error);
        setIssuerCompany(null);
      }
    };

    loadIssuerCompany();
  }, [normalizeGstNumbers, user?.company_id]);

  useEffect(() => {
    if (issuerGstNumbers.length > 0) {
      setIssuerGst(issuerGstNumbers[0]);
    } else {
      setIssuerGst('');
    }
  }, [issuerGstNumbers]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => updateItemTaxAmount(item))
    }));
  }, [formData.taxMode, formData.overallCgstRate, formData.overallSgstRate, formData.overallIgstRate, updateItemTaxAmount]);

  const loadCompanies = useCallback(async () => {
    try {
      // ??? ?? ? ???? ??
      const partnersResponse = await partnerService.getPartners();
      if (partnersResponse?.success) {
        const partners = Array.isArray(partnersResponse.data) ? partnersResponse.data : [];
        // ??? ? ??? ??? ?? (customer, customer_partner)
        const customersOnly = partners.filter((p: any) => {
          const type = (p.business_type || p.businessType || '').toLowerCase();
          return type === 'customer' || type === 'customer_partner';
        });
        const mapped: CompanyInfo[] = customersOnly.map((p: any) => ({
          id: p.id,
          name: p.company_name || '',
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
          business_number: p.business_number || '',
          gst_numbers: normalizeGstNumbers(p.gst_numbers ?? p.gstNumbers ?? p.business_number)
        }));
        setCompanies(mapped);
      }
    } catch (error) {
      console.error('???(???) ?? ?? ??:', error);
    }
  }, [normalizeGstNumbers]);

  const applyFilters = useCallback((list: Invoice[]) => {
    let filteredInvoices = list;

    const normalizedPaymentStatus =
      filters.payment_status && filters.payment_status.toLowerCase() === 'all'
        ? ''
        : filters.payment_status;

    if (normalizedPaymentStatus) {
      filteredInvoices = filteredInvoices.filter(inv => inv.payment_status === normalizedPaymentStatus);
    }

    if (filters.search) {
      filteredInvoices = filteredInvoices.filter(inv =>
        inv.invoice_number.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    return filteredInvoices;
  }, [filters.payment_status, filters.search]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await accountingService.getInvoices({ page: 1, limit: 1000 });
      const rawList = response?.success ? (response.data || []) : [];
      const list: Invoice[] = (rawList as any[]).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        customer_name: inv.customer?.name || '',
        customer_email: inv.customer?.email || '',
        total_amount: Number(inv.total_amount || 0),
        tax_amount: Number(inv.tax_amount || 0),
        sub_total: Number(inv.subtotal || 0),
        status: inv.status || 'draft',
        payment_status: inv.payment_status || 'pending',
        currency: 'INR',
        items: []
      }));
      const filteredInvoices = applyFilters(list);
      setInvoices(filteredInvoices);
      setTotalPages(Math.ceil(filteredInvoices.length / 10));
    } catch (error) {
      showSnackbar(tr('인보이스 목록을 불러오지 못했습니다.', 'Failed to load invoices.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [applyFilters]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices, page, filters]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsEditing(false);
    setIsViewing(false);
    setInvoiceNumber('');
    setRecipientCompanyId('');
    setCustomerGstNumbers([]);
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      customer_gst: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'INR',
      notes: '',
      taxMode: 'overall',
      overallCgstRate: 9,
      overallSgstRate: 9,
      overallIgstRate: 0,
      items: [createEmptyItem()]
    });
    setIsCreating(true);
  };

  useEffect(() => {
    const loadNextNumber = async () => {
      if (!isCreating) return;
      try {
        const response = await accountingService.getNextInvoiceNumber();
        if (response?.success) {
          setNextInvoiceNumber(response.data?.invoice_number || '');
        }
      } catch (error) {
        console.error('Failed to load invoice number:', error);
      }
    };
    loadNextNumber();
  }, [isCreating]);

  const addItemAndFocusName = () => {
    const nextIndex = formData.items.length;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyItem()]
    }));
    setTimeout(() => {
      itemNameRefs.current[nextIndex]?.focus();
    }, 0);
  };

  const generateInvoicePdf = async (_fontScale = 1) => {
    if (!invoicePrintRef.current) {
      throw new Error('Invoice area not found.');
    }
    const invoiceElement = invoicePrintRef.current;
    const pageElements = Array.from(
      invoiceElement.querySelectorAll('.invoice-page')
    ) as HTMLElement[];
    const target = (pageElements.length > 0 ? pageElements[0] : invoiceElement) as HTMLElement;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    // 요구사항: 좌측 2cm, 우측 1cm 여백
    const marginLeft = 20;
    const marginTop = 6;
    const marginRight = 10;
    const marginBottom = 6;
    const contentWidth = pdfWidth - marginLeft - marginRight;
    const contentHeight = pdfHeight - marginTop - marginBottom;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      onclone: (clonedDoc: Document) => {
        // 실제 화면은 건드리지 않고, 복제 DOM에서만 출력용 스타일 적용
        const style = clonedDoc.createElement('style');
        style.textContent = `
          .invoice-page {
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
          .invoice-page * {
            font-size: 9pt;
          }
            .invoice-page .tax-summary-label {
              white-space: nowrap !important;
              word-break: keep-all !important;
            }
            .invoice-page .tax-summary-table td {
              padding-top: 2px !important;
              padding-bottom: 2px !important;
            }
        `;
        clonedDoc.head.appendChild(style);
      }
    });
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const widthRatio = contentWidth / imgProps.width;
    const heightRatio = contentHeight / imgProps.height;
    const ratio = Math.min(widthRatio, heightRatio);
    const renderWidth = imgProps.width * ratio;
    const renderHeight = imgProps.height * ratio;
    const offsetX = marginLeft;
    const offsetY = marginTop;
    // 단일 페이지 강제 렌더링
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderWidth, renderHeight);
    return pdf;
  };

  const handlePrintInvoice = async () => {
    try {
      const pdf = await generateInvoicePdf(1);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            iframe.remove();
          }, 60_000);
        }
      };
      document.body.appendChild(iframe);
    } catch (error) {
      console.error('Print failed:', error);
      showSnackbar(tr('인쇄에 실패했습니다.', 'Failed to print.'), 'error');
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedInvoice) return;
    try {
      const pdf = await generateInvoicePdf();
      pdf.save(`${selectedInvoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('PDF download failed:', error);
      showSnackbar(tr('PDF 다운로드에 실패했습니다.', 'Failed to download PDF.'), 'error');
    }
  };

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    if (!selectedInvoice.customer_email) {
      showSnackbar(tr('고객 이메일이 없습니다.', 'Customer email is missing.'), 'error');
      return;
    }
    try {
      const pdf = await generateInvoicePdf();
      const blob = pdf.output('blob');
      const base64 = await blobToBase64(blob);
      const pdfBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      await accountingService.sendInvoiceEmail(selectedInvoice.id, {
        to: selectedInvoice.customer_email,
        subject: `Invoice ${selectedInvoice.invoice_number}`,
        message: `Please find attached the PDF for Invoice ${selectedInvoice.invoice_number}.`,
        pdf_base64: pdfBase64,
        filename: `${selectedInvoice.invoice_number}.pdf`
      });
      showSnackbar(tr('이메일을 전송했습니다.', 'Email sent.'), 'success');
    } catch (error) {
      console.error('Email send failed:', error);
      showSnackbar(tr('이메일 전송에 실패했습니다.', 'Failed to send email.'), 'error');
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    if (invoice.payment_status === 'paid') {
      showSnackbar(tr('정산 완료된 인보이스는 수정할 수 없습니다.', 'Paid invoices cannot be edited.'), 'error');
      return;
    }
    try {
      setLoading(true);
      const detail = await accountingService.getInvoice(invoice.id);
      const inv = detail?.success ? detail.data : null;
      if (!inv) {
        showSnackbar(tr('인보이스를 불러오지 못했습니다.', 'Failed to load invoice.'), 'error');
        return;
      }

      const rawCustomerId = inv.customer?.id ?? inv.customer_id ?? (invoice as any)?.customer_id;
      const customerId = rawCustomerId ? Number(rawCustomerId) : 0;
      const customerFromInvoice = inv.customer || {};
      const customer = companies.find(c => c.id === customerId);
      const gstList = normalizeGstNumbers(
        customer?.gst_numbers ??
        customer?.gstNumbers ??
        customerFromInvoice.gst_numbers ??
        customerFromInvoice.gstNumbers ??
        customerFromInvoice.gst_number ??
        customerFromInvoice.business_number
      );
      if (customer) {
        setCustomerGstNumbers(gstList);
      } else {
        if (customerId && customerFromInvoice) {
          const mappedCustomer: CompanyInfo = {
            id: customerId,
            name: customerFromInvoice.name || invoice.customer_name || '',
            email: customerFromInvoice.email || invoice.customer_email || '',
            phone: customerFromInvoice.phone || '',
            address: customerFromInvoice.address || '',
            business_number: customerFromInvoice.business_number || '',
            gst_numbers: gstList
          };
          setCompanies(prev => {
            if (prev.some(c => c.id === mappedCustomer.id)) return prev;
            return [mappedCustomer, ...prev];
          });
          setCustomerGstNumbers(gstList);
        } else {
          setCustomerGstNumbers([]);
        }
      }
      const gst = gstList.find(g => g && g.trim() !== '') || '';

      const derivedItems = (inv.items || []).map((it: any) => {
        const totalPrice = Number(it.total_price || 0);
        const taxAmount = Number(it.tax_amount || 0);
        const totalRate = Number(it.tax_rate || 0) || (totalPrice > 0 ? (taxAmount / totalPrice) * 100 : 0);
        const cgstRate = totalRate > 0 ? totalRate / 2 : 0;
        const sgstRate = totalRate > 0 ? totalRate / 2 : 0;
        const igstRate = 0;

        return {
          id: it.id,
          item_name: it.item_name || '',
          description: it.description || '',
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
          total_price: Number(it.total_price || 0),
          tax_rate: Number(it.tax_rate || totalRate),
          tax_amount: Number(it.tax_amount || 0),
          cgstRate,
          sgstRate,
          igstRate
        };
      });

      const hasMixedRates = derivedItems.some((item: InvoiceItem) => {
        const first = derivedItems[0];
        return (
          item.cgstRate !== first.cgstRate ||
          item.sgstRate !== first.sgstRate ||
          item.igstRate !== first.igstRate
        );
      });

      const overallCgstRate = derivedItems[0]?.cgstRate || 0;
      const overallSgstRate = derivedItems[0]?.sgstRate || 0;
      const overallIgstRate = derivedItems[0]?.igstRate || 0;

      setSelectedInvoice({
        ...invoice,
        customer_name: inv.customer?.name || invoice.customer_name,
        customer_email: inv.customer?.email || invoice.customer_email,
        total_amount: Number(inv.total_amount || invoice.total_amount),
        tax_amount: Number(inv.tax_amount || invoice.tax_amount),
        sub_total: Number(inv.subtotal || invoice.sub_total),
        items: derivedItems
      });

      setIsCreating(false);
      setIsViewing(false);
      setInvoiceNumber(inv.invoice_number || invoice.invoice_number || '');
      setRecipientCompanyId(customerId || '');
      setFormData({
        customer_name: inv.customer?.name || '',
        customer_email: inv.customer?.email || '',
        customer_phone: inv.customer?.phone || '',
        customer_address: inv.customer?.address || '',
        customer_gst: gst,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        currency: 'INR',
        notes: inv.notes || '',
        taxMode: hasMixedRates ? 'item' : 'overall',
        overallCgstRate,
        overallSgstRate,
        overallIgstRate,
        items: derivedItems
      });

      setIsEditing(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      showSnackbar(tr('인보이스 상세를 불러오지 못했습니다.', 'Failed to load invoice details.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInvoice = async () => {
    const emptyItemIndex = formData.items.findIndex((item) => !item.item_name || item.item_name.trim() === '');
    if (emptyItemIndex !== -1) {
      showSnackbar(tr('항목명은 필수입니다.', 'Item name is required.'), 'error');
      itemNameRefs.current[emptyItemIndex]?.focus();
      return;
    }
    if (!formData.customer_gst) {
      showSnackbar(tr('GSTIN이 없는 고객은 인보이스를 등록할 수 없습니다.', 'Customers without GSTIN cannot register invoices.'), 'error');
      return;
    }

    setLoading(true);
    try {
      const ensureRecipientPartner = async () => {
        if (recipientCompanyId) return recipientCompanyId;

        const companyName = (formData.customer_name || '').trim();
        if (!companyName) {
          showSnackbar(tr('고객 회사명을 입력해주세요.', 'Please enter a customer company name.'), 'error');
          return '';
        }
        const customerEmail = (formData.customer_email || '').trim();
        if (!customerEmail) {
          showSnackbar(tr('고객 이메일을 입력해주세요.', 'Please enter a customer email.'), 'error');
          return '';
        }

        const existing = companies.find(
          (c) => (c.name || '').trim().toLowerCase() === companyName.toLowerCase()
        );
        if (existing?.id) {
          setRecipientCompanyId(existing.id);
          return existing.id;
        }

        const partnerPayload = {
          companyName,
          businessNumber: (formData.customer_gst || '').trim(),
          email: customerEmail,
          phone: (formData.customer_phone || '').trim() || undefined,
          address: (formData.customer_address || '').trim() || undefined,
          businessType: 'customer_partner',
          status: 'active',
          gstNumbers: [(formData.customer_gst || '').trim()]
        };
        const createResponse = await partnerService.createPartner(partnerPayload);
        if (!createResponse?.success || !createResponse?.data) {
          showSnackbar(
            createResponse?.message || tr('파트너 업체 저장에 실패했습니다.', 'Failed to save partner company.'),
            'error'
          );
          return '';
        }

        const raw = createResponse.data;
        const mappedCompany: CompanyInfo = {
          id: Number(raw.id),
          name: String(raw.company_name || raw.companyName || companyName),
          email: String(raw.email || customerEmail),
          phone: String(raw.phone || formData.customer_phone || ''),
          address: String(raw.address || formData.customer_address || ''),
          business_number: String(raw.business_number || raw.businessNumber || formData.customer_gst || ''),
          gst_numbers: normalizeGstNumbers(raw.gstNumbers ?? raw.gst_numbers ?? formData.customer_gst)
        };
        setCompanies((prev) => [mappedCompany, ...prev]);
        setRecipientCompanyId(mappedCompany.id);
        setCustomerGstNumbers(mappedCompany.gst_numbers || []);
        return mappedCompany.id;
      };

      const resolvedRecipientCompanyId = await ensureRecipientPartner();
      if (!resolvedRecipientCompanyId) {
        return;
      }

      const payload = {
        // ?? ??? ???? customers ???? ???
        ...(isEditing && selectedInvoice ? { invoice_number: selectedInvoice.invoice_number } : {}),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        subtotal: itemsSubtotal,
        tax_amount: itemsTaxTotal,
        total_amount: itemsGrandTotal,
        status: selectedInvoice?.status || 'draft',
        payment_status: selectedInvoice?.payment_status || 'pending',
        notes: formData.notes,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        customer_business_number: formData.customer_gst,
        items: formData.items.map((it) => ({
          item_name: it.item_name,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          tax_rate: it.tax_rate,
          tax_amount: it.tax_amount
        }))
      };

      if (isEditing && selectedInvoice) {
        await accountingService.updateInvoice(selectedInvoice.id, payload);
      } else {
        await accountingService.createInvoice(payload);
      }

      showSnackbar(tr('인보이스가 저장되었습니다.', 'Invoice saved.'), 'success');
      setIsCreating(false);
      setIsEditing(false);
      setIsViewing(false);
      setSelectedInvoice(null);
      await loadInvoices();
      setNextInvoiceNumber('');
    } catch (error: any) {
      console.error('Invoice save failed:', error);
      showSnackbar(error?.response?.data?.message || 'Failed to save invoice.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setIsEditing(false);
    setIsViewing(false);
    setSelectedInvoice(null);
    setRecipientCompanyId('');
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      customer_gst: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'INR',
      notes: '',
      taxMode: 'overall',
      overallCgstRate: 9,
      overallSgstRate: 9,
      overallIgstRate: 0,
      items: [createEmptyItem()]
    });
  };

  const handleDeleteInvoice = (id: number, invoiceNumber?: string, paymentStatus?: string) => {
    if (paymentStatus === 'paid') {
      showSnackbar(tr('정산 완료된 인보이스는 삭제 요청할 수 없습니다.', 'Paid invoices cannot be requested for deletion.'), 'error');
      return;
    }
    setDeleteDialog({ open: true, id, invoiceNumber: invoiceNumber || '' });
  };

  const settleInvoice = async (targetInvoice: Invoice) => {
    if (targetInvoice.payment_status === 'paid') {
      showSnackbar(tr('이미 정산 완료된 인보이스입니다.', 'This invoice is already settled.'), 'error');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await accountingService.updateInvoiceStatus(targetInvoice.id, {
        status: 'paid',
        payment_status: 'paid',
        payment_method: 'cash',
        payment_date: today
      });

      if (!response?.success) {
        showSnackbar(response?.message || tr('정산 완료 처리에 실패했습니다.', 'Failed to complete settlement.'), 'error');
        return;
      }

      setSelectedInvoice((prev) => (
        prev && prev.id === targetInvoice.id
          ? {
              ...prev,
              status: 'paid',
              payment_status: 'paid'
            }
          : prev
      ));
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === targetInvoice.id
            ? { ...invoice, status: 'paid', payment_status: 'paid' }
            : invoice
        )
      );
      showSnackbar(tr('정산 완료 처리되었습니다.', 'Settlement completed.'), 'success');
    } catch (error: any) {
      console.error('정산 완료 처리 오류:', error);
      showSnackbar(error?.response?.data?.message || tr('정산 완료 처리 중 오류가 발생했습니다.', 'An error occurred during settlement.'), 'error');
    }
  };

  const handleSettlementComplete = async () => {
    if (!selectedInvoice) return;
    await settleInvoice(selectedInvoice);
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteDialog.id) return;
    try {
      setLoading(true);
      await accountingService.deleteInvoice(deleteDialog.id);
      showSnackbar(tr('삭제 승인 요청이 등록되었습니다.', 'Delete approval request has been submitted.'), 'success');
      setDeleteDialog({ open: false, id: null, invoiceNumber: '' });
      setIsViewing(false);
      setSelectedInvoice(null);
      await loadInvoices();
    } catch (error: any) {
      console.error('Invoice delete failed:', error);
      showSnackbar(error?.response?.data?.message || tr('삭제 승인 요청 등록에 실패했습니다.', 'Failed to submit delete approval request.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    // 1) 리스트 데이터로 즉시 상세 화면 오픈 (항상 보기 가능)
    setViewCustomer({
      name: invoice.customer_name || '',
      email: invoice.customer_email || '',
      phone: '',
      address: '',
      gst: '',
      pan: ''
    });
    setSelectedInvoice({
      ...invoice,
      total_amount: Number(invoice.total_amount || 0),
      tax_amount: Number(invoice.tax_amount || 0),
      sub_total: Number(invoice.sub_total || 0),
      notes: invoice.notes ?? '',
      items: (invoice.items || []).map((it: any) => ({
        id: it.id,
        item_name: it.item_name || '',
        description: it.description || '',
        quantity: Number(it.quantity || 0),
        unit_price: Number(it.unit_price || 0),
        total_price: Number(it.total_price || 0),
        tax_rate: Number(it.tax_rate || 0),
        tax_amount: Number(it.tax_amount || 0)
      }))
    });
    setIsCreating(false);
    setIsEditing(false);
    setIsViewing(true);

    try {
      // 2) 상세 API 성공 시 더 정확한 데이터로 보강
      setLoading(true);
      const detail = await accountingService.getInvoice(invoice.id);
      const inv = detail?.success ? detail.data : null;
      if (!inv) {
        return;
      }
      const customerGstNumbers = normalizeGstNumbers(
        inv.customer?.gst_numbers ?? inv.customer?.gstNumbers ?? inv.customer?.gst_number ?? inv.customer?.business_number
      );
      setViewCustomer({
        name: inv.customer?.name || '',
        email: inv.customer?.email || '',
        phone: inv.customer?.phone || '',
        address: inv.customer?.address || '',
        gst: customerGstNumbers[0] || '',
        pan: ''
      });
      setSelectedInvoice({
        ...invoice,
        customer_name: inv.customer?.name || invoice.customer_name,
        customer_email: inv.customer?.email || invoice.customer_email,
        total_amount: Number(inv.total_amount || invoice.total_amount),
        tax_amount: Number(inv.tax_amount || invoice.tax_amount),
        sub_total: Number(inv.subtotal || invoice.sub_total),
        notes: inv.notes ?? invoice.notes ?? '',
        items: (inv.items || []).map((it: any) => ({
          id: it.id,
          item_name: it.item_name || '',
          description: it.description || '',
          quantity: Number(it.quantity || 0),
          unit_price: Number(it.unit_price || 0),
          total_price: Number(it.total_price || 0),
          tax_rate: Number(it.tax_rate || 0),
          tax_amount: Number(it.tax_amount || 0)
        }))
      });
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      // 상세 보강 실패는 무시하고 이미 열린 화면(리스트 스냅샷) 유지
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingPrintInvoiceId) return;
    if (!isViewing || !selectedInvoice) return;
    if (selectedInvoice.id !== pendingPrintInvoiceId) return;

    setTimeout(() => {
      void handlePrintInvoice();
    }, 0);
    setPendingPrintInvoiceId(null);
  }, [isViewing, pendingPrintInvoiceId, selectedInvoice]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'paid': return 'success';
      case 'partial': return 'info';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return tr('대기', 'Pending');
      case 'paid': return tr('완료', 'Paid');
      case 'partial': return tr('부분', 'Partial');
      case 'overdue': return tr('연체', 'Overdue');
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ?? */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ReceiptIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'red',
            lineHeight: 1.5
          }}>
            {tr('일반 세금계산서', 'Regular Tax Invoice')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {tr('일반 세금계산서를 생성하고 관리합니다.', 'Create and manage regular invoices.')}
        </Typography>
      </Box>

      {/* ?? ? ?? */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={tr('인보이스 번호 또는 고객명 검색', 'Search by invoice number or customer')}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{tr('결제 상태', 'Payment Status')}</InputLabel>
                <Select
                  value={filters.payment_status}
                  label={tr('결제 상태', 'Payment Status')}
                  onChange={(e) => {
                    const value = String(e.target.value);
                    setFilters({ ...filters, payment_status: value.toLowerCase() === 'all' ? '' : value });
                  }}
                >
                  <MenuItem value="">{tr('전체', 'All')}</MenuItem>
                  <MenuItem value="pending">{tr('대기', 'Pending')}</MenuItem>
                  <MenuItem value="paid">{tr('완료', 'Paid')}</MenuItem>
                  <MenuItem value="partial">{tr('부분', 'Partial')}</MenuItem>
                  <MenuItem value="overdue">{tr('연체', 'Overdue')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  disabled={loading}
                  onClick={() => setFilters({ payment_status: '', search: '' })}
                >
                  {tr('필터 초기화', 'Reset Filters')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={loading}
                  onClick={handleCreateInvoice}
                >
                  {tr('새 인보이스', 'New Invoice')}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ???? ??/?? ? */}
      {isViewing && selectedInvoice ? (
        <Card sx={{ mb: 3, bgcolor: 'white', border: '1px solid', borderColor: 'grey.300' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Box ref={invoicePrintRef}>
            {itemPages.map((pageItems, pageIndex) => {
              const isFirst = pageIndex === 0;
              const isLast = pageIndex === itemPages.length - 1;
              return (
                <Box
                  key={`invoice-page-${pageIndex}`}
                  className="invoice-page"
                  sx={{
                    ...(pageIndex > 0 ? { mt: 2 } : {}),
                    breakAfter: isLast ? 'auto' : 'page',
                    pageBreakAfter: isLast ? 'auto' : 'always'
                  }}
                >
                  {isFirst && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                        <Box>
                          <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                            TAX INVOICE
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {issuerCompany?.name || ''}
                          </Typography>
                          {issuerCompany?.company_logo && (
                            <Box sx={{ mt: 1, mb: 0.8, display: 'flex', justifyContent: 'flex-start' }}>
                              <Box
                                component="img"
                                src={issuerCompany.company_logo}
                                alt="Company logo"
                                sx={{ maxHeight: 60, maxWidth: 220, objectFit: 'contain' }}
                              />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ minWidth: 220 }}>
                          <Table size="small">
                            <TableBody>
                              {[
                                { label: tr('인보이스 번호', 'Invoice No'), value: selectedInvoice.invoice_number },
                                { label: tr('인보이스 발행일', 'Invoice Date'), value: new Date(selectedInvoice.invoice_date).toLocaleDateString() }
                              ].map((row) => (
                                <TableRow key={row.label}>
                                  <TableCell sx={{ borderBottom: 'none', px: 0, py: 0.5 }}>{row.label}</TableCell>
                                  <TableCell sx={{ borderBottom: 'none', px: 0, py: 0.5, textAlign: 'right' }}>{row.value}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Box>

                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card variant="outlined" sx={{ height: '100%', borderColor: 'grey.400' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {tr('공급자', 'Supplier')}
                              </Typography>
                              {issuerCompany ? (
                                <Stack spacing={0.4}>
                                  <Typography variant="body2" fontWeight={600}>{issuerCompany.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{tr('사업자번호', 'Business No.')}: {issuerCompany.business_number || '-'}</Typography>
                                  <Typography variant="caption" color="text.secondary">GSTIN: {issuerGst || '-'}</Typography>
                                  <Typography variant="caption" color="text.secondary">PAN: {issuerCompany.pan_number || '-'}</Typography>
                                  {issuerCompany.address && (
                                    <Typography variant="caption" color="text.secondary">{tr('주소', 'Address')}: {issuerCompany.address}</Typography>
                                  )}
                                  {issuerCompany.phone && (
                                    <Typography variant="caption" color="text.secondary">{tr('연락처', 'Phone')}: {issuerCompany.phone}</Typography>
                                  )}
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">{tr('공급자 회사 정보가 없습니다.', 'No issuer company information')}</Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card variant="outlined" sx={{ height: '100%', borderColor: 'grey.400' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {tr('청구 대상', 'Bill To')}
                              </Typography>
                              <Stack spacing={0.4}>
                                <Typography variant="body2" fontWeight={600}>{viewCustomer.name || selectedInvoice.customer_name}</Typography>
                                <Typography variant="caption" color="text.secondary">GSTIN: {viewCustomer.gst || '-'}</Typography>
                                <Typography variant="caption" color="text.secondary">{tr('연락처', 'Phone')}: {viewCustomer.phone || '-'}</Typography>
                                <Typography variant="caption" color="text.secondary">{tr('주소', 'Address')}: {viewCustomer.address || '-'}</Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Card variant="outlined" sx={{ borderColor: 'grey.400' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {tr('배송 대상', 'Shipping To')}
                              </Typography>
                              <Stack spacing={0.4}>
                                <Typography variant="body2" fontWeight={600}>{viewCustomer.name || selectedInvoice.customer_name}</Typography>
                                <Typography variant="caption" color="text.secondary">GSTIN: {viewCustomer.gst || '-'}</Typography>
                                <Typography variant="caption" color="text.secondary">{tr('연락처', 'Phone')}: {viewCustomer.phone || '-'}</Typography>
                                <Typography variant="caption" color="text.secondary">{tr('주소', 'Address')}: {viewCustomer.address || '-'}</Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </>
                  )}

                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderColor: 'grey.300' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ width: '6%' }}>No</TableCell>
                          <TableCell align="left" sx={{ width: '50%' }}>Item</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>HSN/SAC</TableCell>
                          <TableCell align="center" sx={{ width: '6%' }}>Qty</TableCell>
                          <TableCell align="center" sx={{ width: '10%' }}>Unit Price</TableCell>
                          {hasGstInItems ? (
                            <>
                              <TableCell align="center" sx={{ width: '6%' }}>CGST (%)</TableCell>
                              <TableCell align="center" sx={{ width: '6%' }}>SGST (%)</TableCell>
                              {hasIgstInItems && (
                                <TableCell align="center" sx={{ width: '6%' }}>IGST (%)</TableCell>
                              )}
                            </>
                          ) : null}
                          <TableCell align="center" sx={{ width: '10%' }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pageItems.map((item, idx) => {
                          const itemNumber = pageIndex * itemsPerPage + idx + 1;
                          const { cgstRate, sgstRate, igstRate } = getDisplayGstRates(item);
                          const baseAmount = Number(item.total_price || 0);
                          const lineAmount = uniformGstRate !== null ? baseAmount : baseAmount + Number(item.tax_amount || 0);
                          return (
                            <TableRow key={item.id ?? itemNumber} sx={{ '& td': { py: 0.6 } }}>
                              <TableCell align="center" sx={{ width: '6%' }}>{itemNumber}</TableCell>
                              <TableCell align="left" sx={{ width: '50%' }}>{item.item_name}</TableCell>
                              <TableCell align="center" sx={{ width: '10%' }}>{item.description}</TableCell>
                              <TableCell align="center" sx={{ width: '6%' }}>{item.quantity}</TableCell>
                              <TableCell align="center" sx={{ width: '10%' }}>{(item.unit_price || 0).toLocaleString()}</TableCell>
                              {hasGstInItems ? (
                                <>
                                  <TableCell align="center" sx={{ width: '6%' }}>{cgstRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                  <TableCell align="center" sx={{ width: '6%' }}>{sgstRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                  {hasIgstInItems && (
                                    <TableCell align="center" sx={{ width: '6%' }}>{igstRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                  )}
                                </>
                              ) : null}
                              <TableCell align="center" sx={{ width: '10%' }}>{lineAmount.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {isLast && (
                    <>
                      <Card variant="outlined" sx={{ borderColor: 'grey.400' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Table size="small" sx={{ width: '100%' }} className="tax-summary-table">
                            <TableBody>
                              <TableRow sx={{ bgcolor: 'grey.100' }}>
                                {summaryColumnSx.map((col, idx) => {
                                  const labelIndex = summaryAmountColumn - 2;
                                  const amountIndex = summaryAmountColumn - 1;
                                  if (idx === labelIndex) {
                                    return (
                                      <TableCell key={idx} sx={{ ...col, borderBottom: 'none', textAlign: 'right', fontWeight: 700 }}>
                                        {uniformGstRate !== null ? 'Sum' : 'Subtotal'}
                                      </TableCell>
                                    );
                                  }
                                  if (idx === amountIndex) {
                                    return (
                                      <TableCell key={idx} sx={{ ...col, borderBottom: 'none', textAlign: 'right', fontWeight: 700 }}>
                                        {formatFloorAmount(selectedInvoice.sub_total ?? viewItemsSubtotal ?? itemsSubtotal)} {selectedInvoice.currency}
                                      </TableCell>
                                    );
                                  }
                                  return <TableCell key={idx} sx={{ ...col, borderBottom: 'none' }} />;
                                })}
                              </TableRow>
                              {uniformGstRate !== null ? (
                                <>
                                  {[tr('C GST', 'C GST'), tr('S GST', 'S GST')].map((label) => (
                                    <TableRow key={label}>
                                      {summaryColumnSx.map((col, idx) => {
                                        const labelIndex = summaryAmountColumn - 2;
                                        const amountIndex = summaryAmountColumn - 1;
                                        if (idx === labelIndex) {
                                          return (
                                            <TableCell key={idx} className="tax-summary-label" sx={{ ...col, borderBottom: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                              {label} ({(uniformGstRate / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}%)
                                            </TableCell>
                                          );
                                        }
                                        if (idx === amountIndex) {
                                          return (
                                            <TableCell key={idx} sx={{ ...col, borderBottom: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                              {formatFloorAmount(computedTaxTotal / 2)} {selectedInvoice.currency}
                                            </TableCell>
                                          );
                                        }
                                        return <TableCell key={idx} sx={{ ...col, borderBottom: 'none' }} />;
                                      })}
                                    </TableRow>
                                  ))}
                                </>
                              ) : (
                                (selectedInvoice.tax_amount ?? viewItemsTaxTotal ?? itemsTaxTotal) > 0 && (
                                  <TableRow>
                                    {summaryColumnSx.map((col, idx) => {
                                      const labelIndex = summaryAmountColumn - 2;
                                      const amountIndex = summaryAmountColumn - 1;
                                      if (idx === labelIndex) {
                                        return (
                                          <TableCell key={idx} className="tax-summary-label" sx={{ ...col, borderBottom: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            GST Total Amount
                                          </TableCell>
                                        );
                                      }
                                      if (idx === amountIndex) {
                                        return (
                                          <TableCell key={idx} sx={{ ...col, borderBottom: 'none', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {formatFloorAmount(computedTaxTotal)} {selectedInvoice.currency}
                                          </TableCell>
                                        );
                                      }
                                      return <TableCell key={idx} sx={{ ...col, borderBottom: 'none' }} />;
                                    })}
                                  </TableRow>
                                )
                              )}
                              <TableRow sx={{ bgcolor: 'grey.100' }}>
                                {summaryColumnSx.map((col, idx) => {
                                  const labelIndex = summaryAmountColumn - 2;
                                  const amountIndex = summaryAmountColumn - 1;
                                  if (idx === labelIndex) {
                                    return (
                                      <TableCell key={idx} sx={{ ...col, borderBottom: 'none', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {uniformGstRate !== null ? tr('총합계 금액', 'Grand Total Amount') : tr('합계', 'Total')}
                                      </TableCell>
                                    );
                                  }
                                  if (idx === amountIndex) {
                                    return (
                                      <TableCell key={idx} sx={{ ...col, borderBottom: 'none', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {formatFloorAmount(displayGrandTotal)} {selectedInvoice.currency}
                                      </TableCell>
                                    );
                                  }
                                  return <TableCell key={idx} sx={{ ...col, borderBottom: 'none' }} />;
                                })}
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      <Box sx={{ mt: 1.5, display: 'grid', gap: 0.8 }}>
                        {(issuerCompany?.bank_name || issuerCompany?.account_number || issuerCompany?.ifsc_code || issuerCompany?.account_holder_name) && (
                          <Paper variant="outlined" sx={{ p: 1.2, borderColor: 'grey.400' }}>
                            <Typography variant="body2" fontWeight={600}>
                              {tr('계좌 정보', 'Bank Details')}
                            </Typography>
                            <Stack spacing={0.2} sx={{ mt: 0.6 }}>
                              {issuerCompany?.account_holder_name && (
                                <Typography variant="body2" color="text.secondary">
                                  Account Holder: {issuerCompany.account_holder_name}
                                </Typography>
                              )}
                              {issuerCompany?.bank_name && (
                                <Typography variant="body2" color="text.secondary">
                                  Bank Name: {issuerCompany.bank_name}
                                </Typography>
                              )}
                              {issuerCompany?.account_number && (
                                <Typography variant="body2" color="text.secondary">
                                  Account Number: {issuerCompany.account_number}
                                </Typography>
                              )}
                              {issuerCompany?.ifsc_code && (
                                <Typography variant="body2" color="text.secondary">
                                  IFSC: {issuerCompany.ifsc_code}
                                </Typography>
                              )}
                              {issuerCompany?.bank_address && (
                                <Typography variant="body2" color="text.secondary">
                                  {tr('은행 주소', 'Bank Address')}: {issuerCompany.bank_address}
                                </Typography>
                              )}
                            </Stack>
                          </Paper>
                        )}
                        <Paper variant="outlined" sx={{ p: 1.2, borderColor: 'grey.400' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {tr('총합계 금액(문자)', 'Grand Total Amount (in words)')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                            {formatInrWords(Math.floor(displayGrandTotal))}
                          </Typography>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 1.2, borderColor: 'grey.400' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {tr('확인 문구', 'Declaration')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                          </Typography>
                        </Paper>
                      </Box>

                      {(issuerCompany?.company_seal || issuerCompany?.ceo_signature) && (
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.6 }}>
                            <Typography variant="body2" fontWeight={600}>
                              For {issuerCompany?.name || 'Company'}
                            </Typography>
                            <Box sx={{ position: 'relative', width: '7cm', height: '3cm' }}>
                            {issuerCompany.company_seal && (
                              <Box
                                component="img"
                                src={issuerCompany.company_seal}
                                alt="Company seal"
                                sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                              />
                            )}
                            {issuerCompany.ceo_signature && (
                              <Box
                                component="img"
                                src={issuerCompany.ceo_signature}
                                alt="Signature"
                                sx={{
                                  position: 'absolute',
                                  right: 0,
                                  bottom: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain'
                                }}
                              />
                            )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {tr('승인 서명', 'Authorised Signatory')}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ mb: 0.2, color: 'text.secondary', fontSize: '0.875rem' }}>
                          {tr('메모', 'Memo')}
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.5, minHeight: 64, borderColor: 'grey.300' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedInvoice.notes && selectedInvoice.notes.trim() ? selectedInvoice.notes : '-'}
                          </Typography>
                        </Paper>
                      </Box>
                    </>
                  )}
                </Box>
              );
            })}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" onClick={() => setIsViewing(false)}>
                {tr('목록으로', 'Back to list')}
              </Button>
              {selectedInvoice.payment_status !== 'paid' && (
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditInvoice(selectedInvoice)}>
                  {tr('수정', 'Edit')}
                </Button>
              )}
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintInvoice}>
                {tr('인쇄', 'Print')}
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadPdf}>
                {tr('PDF 다운로드', 'Download PDF')}
              </Button>
              {selectedInvoice.payment_status !== 'paid' && (
                <Button variant="contained" color="success" onClick={handleSettlementComplete}>
                  {tr('정산완료', 'Settlement Complete')}
                </Button>
              )}
              <Button variant="outlined" startIcon={<SendIcon />} onClick={handleSendEmail}>
                {tr('이메일 전송', 'Send Email')}
              </Button>
              {selectedInvoice.payment_status !== 'paid' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    handleDeleteInvoice(
                      selectedInvoice.id,
                      selectedInvoice.invoice_number,
                      selectedInvoice.payment_status
                    );
                  }}
                >
                  {tr('삭제요청', 'Request Delete')}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : ((isCreating || isEditing) ? (
        <Card sx={{ mb: 3, bgcolor: '#fdfbf7', border: '1px solid', borderColor: 'grey.200', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                  TAX INVOICE
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isEditing ? tr('인보이스 수정', 'Edit Invoice') : tr('일반 세금계산서 생성', 'Create Regular Tax Invoice')}
                </Typography>
              </Box>
              <Stack spacing={1} alignItems="flex-end">
                <Typography variant="caption" color="text.secondary">
                  {tr('인보이스 번호', 'Invoice No.')}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {isEditing && selectedInvoice ? selectedInvoice.invoice_number : generatedInvoiceNumber}
                </Typography>
                <Button variant="outlined" onClick={handleCancelEdit}>
                  {tr('취소', 'Cancel')}
                </Button>
              </Stack>
            </Box>

            {issuerCompany?.company_logo && (
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
                <Box
                  component="img"
                  src={issuerCompany.company_logo}
                  alt="Company logo"
                  sx={{ maxHeight: 60, maxWidth: 220, objectFit: 'contain' }}
                />
              </Box>
            )}

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, md: 12 }}>
                    <Card variant="outlined" sx={{ bgcolor: 'white' }}>
                      <CardContent>
                        {issuerCompany ? (
                          <Stack spacing={0.5}>
                            <Typography variant="body2" fontWeight={600}>{issuerCompany.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Business No.: {issuerCompany.business_number || '-'}
                            </Typography>
                            {issuerGstNumbers.length > 1 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">GSTIN:</Typography>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                  <Select
                                    value={issuerGst || issuerGstNumbers[0]}
                                    onChange={(e) => setIssuerGst(String(e.target.value))}
                                  >
                                    {issuerGstNumbers.map((gst) => (
                                      <MenuItem key={gst} value={gst}>
                                        {gst}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                GSTIN: {issuerGstNumbers[0] || '-'}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              PAN: {issuerCompany.pan_number || '-'}
                            </Typography>
                            {issuerCompany.address && (
                              <Typography variant="caption" color="text.secondary">Address: {issuerCompany.address}</Typography>
                            )}
                            {issuerCompany.phone && (
                              <Typography variant="caption" color="text.secondary">Phone: {issuerCompany.phone}</Typography>
                            )}
                            {issuerCompany.email && (
                              <Typography variant="caption" color="text.secondary">Email: {issuerCompany.email}</Typography>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No issuer company information</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ bgcolor: 'white', height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Bill to
                    </Typography>
                    <Grid container spacing={0.8}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.15, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Customer Company *
                        </Typography>
                        <Autocomplete
                          fullWidth
                          size="small"
                          freeSolo
                          options={companies}
                          getOptionLabel={(option) => (typeof option === 'string' ? option : option?.name || '')}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          value={companies.find(c => c.id === recipientCompanyId) || null}
                          inputValue={formData.customer_name}
                          onInputChange={(_, value) => {
                            setRecipientCompanyId('');
                            setCustomerGstNumbers([]);
                            setFormData((prev) => ({
                              ...prev,
                              customer_name: value
                            }));
                          }}
                          onChange={(_, value) => {
                            if (typeof value === 'string') {
                              setRecipientCompanyId('');
                              setCustomerGstNumbers([]);
                              setFormData({
                                ...formData,
                                customer_name: value
                              });
                              return;
                            }
                            const companyId = value ? value.id : '';
                            setRecipientCompanyId(companyId);
                            if (value) {
                              const gstList = normalizeGstNumbers(value.gst_numbers ?? value.gstNumbers);
                              const gst = gstList.find(g => g && g.trim() !== '') || '';
                              setCustomerGstNumbers(gstList);
                              setFormData({
                                ...formData,
                                customer_name: value.name || '',
                                customer_email: value.email || '',
                                customer_phone: value.phone || '',
                                customer_address: value.address || '',
                                customer_gst: gst
                              });
                            } else {
                              setCustomerGstNumbers([]);
                              setFormData({
                                ...formData,
                                customer_name: formData.customer_name,
                                customer_email: '',
                                customer_phone: '',
                                customer_address: '',
                                customer_gst: ''
                              });
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={tr('회사 선택 또는 입력', 'Select or type company')}
                              size="small"
                              inputProps={{
                                ...params.inputProps,
                                autoComplete: 'new-password'
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.15, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Customer Email *
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          type="email"
                          value={formData.customer_email}
                          onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.15, color: 'text.secondary', fontSize: '0.875rem' }}>
                          GSTIN *
                        </Typography>
                        {customerGstNumbers.length > 1 ? (
                          <FormControl size="small" fullWidth error={!formData.customer_gst}>
                            <Select
                              value={formData.customer_gst || customerGstNumbers[0] || ''}
                              onChange={(e) => setFormData({ ...formData, customer_gst: String(e.target.value) })}
                            >
                              {customerGstNumbers.map((gst) => (
                                <MenuItem key={gst} value={gst}>
                                  {gst}
                                </MenuItem>
                              ))}
                            </Select>
                            {!formData.customer_gst && (
                              <FormHelperText>GSTIN is required to register an invoice.</FormHelperText>
                            )}
                          </FormControl>
                        ) : (
                          <TextField
                            size="small"
                            fullWidth
                            value={formData.customer_gst}
                            onChange={(e) => setFormData({ ...formData, customer_gst: e.target.value })}
                            required
                            placeholder="GSTIN"
                            error={!formData.customer_gst}
                            helperText={!formData.customer_gst ? 'GSTIN is required to register an invoice.' : ''}
                          />
                        )}
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.15, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Customer Phone
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.15, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Customer Address
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          value={formData.customer_address}
                          onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ bgcolor: 'white', height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Issue Info
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.2, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Issue Date *
                        </Typography>
                        <TextField
                          fullWidth
                          type="date"
                          value={formData.invoice_date}
                          onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 0.2, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Currency
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          >
                            <MenuItem value="INR">INR</MenuItem>
                            <MenuItem value="USD">USD</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'white'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
                      ITEMIZED COSTS
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      size="small"
                      onClick={addItemAndFocusName}
                    >
                      Add Item
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', px: 2, py: 0.8, bgcolor: 'grey.50', borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'grey.200' }}>
                    <Box sx={{ flex: 1.6, pr: 2, display: 'flex', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flex: 1 }}>Item Name</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flex: 0.5 }}>HSN/SAC</Typography>
                    </Box>
                    <Box sx={{ width: 110, pr: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>QTY</Typography>
                    </Box>
                    <Box sx={{ width: 160, pr: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>UNIT PRICE</Typography>
                    </Box>
                        <Box sx={{ width: 240, pr: 2, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>CGST / SGST / IGST (%)</Typography>
                        </Box>
                    <Box sx={{ width: 120, pr: 2, textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>AMOUNT</Typography>
                    </Box>
                    <Box sx={{ width: 40, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>-</Typography>
                    </Box>
                  </Box>

                  {formData.items.length > 0 ? (
                    formData.items.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          px: 2,
                          py: 1,
                          borderBottom: index === formData.items.length - 1 ? 'none' : '1px solid',
                          borderColor: 'grey.200'
                        }}
                      >
                        <Box sx={{ flex: 1.6, pr: 2, display: 'flex', gap: 1 }}>
                          <TextField
                            size="small"
                            inputRef={(el) => {
                              if (el) itemNameRefs.current[index] = el;
                            }}
                            value={item.item_name}
                            onChange={(e) => {
                              const updatedItems = [...formData.items];
                              updatedItems[index].item_name = e.target.value;
                              updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                descriptionRefs.current[index]?.focus();
                              }
                            }}
                            placeholder="Item Name"
                            fullWidth
                            sx={{ flex: 1, ...itemInputSx }}
                            inputProps={{ style: { padding: '6px 8px' } }}
                          />
                          <TextField
                            size="small"
                            inputRef={(el) => {
                              if (el) descriptionRefs.current[index] = el;
                            }}
                            value={item.description}
                            onChange={(e) => {
                              const updatedItems = [...formData.items];
                              updatedItems[index].description = e.target.value;
                              updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                quantityRefs.current[index]?.focus();
                              }
                            }}
                            placeholder="HSN/SAC"
                            fullWidth
                            sx={{ flex: 0.5, ...itemInputSx }}
                            inputProps={{ style: { padding: '6px 8px' } }}
                          />
                        </Box>
                        <Box sx={{ width: 110, pr: 2 }}>
                          <TextField
                            size="small"
                            type="number"
                            inputRef={(el) => {
                              if (el) quantityRefs.current[index] = el;
                            }}
                            value={item.quantity}
                            onChange={(e) => {
                              const updatedItems = [...formData.items];
                              const qty = parseFloat(e.target.value) || 0;
                              updatedItems[index].quantity = qty;
                              updatedItems[index].total_price = qty * updatedItems[index].unit_price;
                              updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                unitPriceRefs.current[index]?.focus();
                              }
                            }}
                            fullWidth
                            sx={itemInputSx}
                            inputProps={{ style: { padding: '6px 8px' } }}
                          />
                        </Box>
                        <Box sx={{ width: 160, pr: 2 }}>
                          <TextField
                            size="small"
                            type="number"
                            inputRef={(el) => {
                              if (el) unitPriceRefs.current[index] = el;
                            }}
                            value={item.unit_price}
                            onChange={(e) => {
                              const updatedItems = [...formData.items];
                              const price = parseFloat(e.target.value) || 0;
                              updatedItems[index].unit_price = price;
                              updatedItems[index].total_price = updatedItems[index].quantity * price;
                              updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addItemAndFocusName();
                              }
                            }}
                            fullWidth
                            sx={itemInputSx}
                            inputProps={{ style: { padding: '6px 8px' } }}
                          />
                        </Box>
                        <Box sx={{ width: 240, pr: 2, display: 'flex', gap: 1 }}>
                          <FormControl size="small" fullWidth disabled={formData.taxMode === 'overall' || (item.igstRate || 0) > 0} sx={itemInputSx}>
                            <Select
                              value={formData.taxMode === 'overall' ? formData.overallCgstRate : (item.cgstRate || 0)}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                const updatedItems = [...formData.items];
                                updatedItems[index].cgstRate = rate;
                                updatedItems[index].sgstRate = rate;
                                updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                                setFormData({ ...formData, items: updatedItems });
                              }}
                            >
                              {allowedGstRates.map((rate) => (
                                <MenuItem key={`cgst-${rate}`} value={rate}>
                                  {rate}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" fullWidth disabled={formData.taxMode === 'overall' || (item.igstRate || 0) > 0} sx={itemInputSx}>
                            <Select
                              value={formData.taxMode === 'overall' ? formData.overallSgstRate : (item.sgstRate || 0)}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                const updatedItems = [...formData.items];
                                updatedItems[index].sgstRate = rate;
                                updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                                setFormData({ ...formData, items: updatedItems });
                              }}
                            >
                              {allowedGstRates.map((rate) => (
                                <MenuItem key={`sgst-${rate}`} value={rate}>
                                  {rate}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" fullWidth disabled={formData.taxMode === 'overall'} sx={itemInputSx}>
                            <Select
                              value={formData.taxMode === 'overall' ? formData.overallIgstRate : (item.igstRate || 0)}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                const updatedItems = [...formData.items];
                                updatedItems[index].igstRate = rate;
                                if (rate > 0) {
                                  updatedItems[index].cgstRate = 0;
                                  updatedItems[index].sgstRate = 0;
                                }
                                updatedItems[index] = updateItemTaxAmount(updatedItems[index]);
                                setFormData({ ...formData, items: updatedItems });
                              }}
                            >
                              {allowedIgstRates.map((rate) => (
                                <MenuItem key={`igst-${rate}`} value={rate}>
                                  {rate}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        <Box sx={{ width: 120, pr: 2, textAlign: 'right' }}>
                          <Typography variant="body2">
                            {(item.total_price + item.tax_amount).toLocaleString()} {formData.currency}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 40, textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const updatedItems = formData.items.filter((_, i) => i !== index);
                              setFormData({ ...formData, items: updatedItems });
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ px: 2, py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        No items added.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ mt: 2, bgcolor: 'white' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Tax Settings
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                          Input Mode
                        </Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            size="small"
                            value={formData.taxMode}
                            onChange={(e) => setFormData({ ...formData, taxMode: e.target.value as 'overall' | 'item' })}
                          >
                            <MenuItem value="overall">Overall</MenuItem>
                            <MenuItem value="item">Per Item</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                              CGST (%)
                            </Typography>
                            <FormControl size="small" fullWidth disabled={formData.taxMode === 'item' || formData.overallIgstRate > 0}>
                              <Select
                                value={formData.overallCgstRate}
                                onChange={(e) => {
                                  const rate = Number(e.target.value) || 0;
                                  setFormData(prev => ({
                                    ...prev,
                                    overallCgstRate: rate,
                                    overallSgstRate: rate
                                  }));
                                }}
                              >
                                {allowedGstRates.map((rate) => (
                                  <MenuItem key={`overall-cgst-${rate}`} value={rate}>
                                    {rate}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                              SGST (%)
                            </Typography>
                            <FormControl size="small" fullWidth disabled={formData.taxMode === 'item' || formData.overallIgstRate > 0}>
                              <Select
                                value={formData.overallSgstRate}
                                onChange={(e) => {
                                  const rate = Number(e.target.value) || 0;
                                  setFormData(prev => ({ ...prev, overallSgstRate: rate }));
                                }}
                              >
                                {allowedGstRates.map((rate) => (
                                  <MenuItem key={`overall-sgst-${rate}`} value={rate}>
                                    {rate}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                              IGST (%)
                            </Typography>
                            <FormControl size="small" fullWidth disabled={formData.taxMode === 'item'}>
                              <Select
                                value={formData.overallIgstRate}
                                onChange={(e) => {
                                  const rate = Number(e.target.value) || 0;
                                  setFormData(prev => ({
                                    ...prev,
                                    overallIgstRate: rate,
                                    overallCgstRate: rate > 0 ? 0 : prev.overallCgstRate,
                                    overallSgstRate: rate > 0 ? 0 : prev.overallSgstRate
                                  }));
                                }}
                              >
                                {allowedIgstRates.map((rate) => (
                                  <MenuItem key={`overall-igst-${rate}`} value={rate}>
                                    {rate}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Card variant="outlined" sx={{ minWidth: 260, bgcolor: 'white' }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                          <Typography variant="body2">{itemsSubtotal.toLocaleString()}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Tax</Typography>
                          <Typography variant="body2">{itemsTaxTotal.toLocaleString()}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">Total</Typography>
                          <Typography variant="subtitle2">{itemsGrandTotal.toLocaleString()} {formData.currency}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.2, color: 'text.secondary', fontSize: '0.875rem' }}>
                    Memo
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={8}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Box>
              </Grid>

              {(issuerCompany?.company_seal || issuerCompany?.ceo_signature) && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Box sx={{ position: 'relative', width: '7cm', height: '3cm' }}>
                      {issuerCompany.company_seal && (
                        <Box
                          component="img"
                          src={issuerCompany.company_seal}
                          alt="Company seal"
                          sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                      )}
                      {issuerCompany.ceo_signature && (
                        <Box
                          component="img"
                          src={issuerCompany.ceo_signature}
                          alt="Signature"
                          sx={{
                            position: 'absolute',
                            right: 0,
                            bottom: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                  <Button variant="outlined" onClick={handleCancelEdit}>
                    {tr('취소', 'Cancel')}
                  </Button>
                  <Button variant="contained" onClick={handleSaveInvoice}>
                    {tr('저장', 'Save')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ???? ?? */}
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{tr('인보이스 번호', 'Invoice No.')}</TableCell>
                      <TableCell>{tr('고객', 'Customer')}</TableCell>
                      <TableCell>{tr('발행일', 'Issue Date')}</TableCell>
                      <TableCell>{tr('만기일', 'Due Date')}</TableCell>
                      <TableCell>{tr('금액', 'Amount')}</TableCell>
                      <TableCell>{tr('결제 상태', 'Payment Status')}</TableCell>
                      <TableCell align="center">{tr('작업', 'Actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        hover
                        onClick={() => handleViewInvoice(invoice)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {invoice.invoice_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {invoice.customer_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {invoice.total_amount.toLocaleString()} {invoice.currency}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getPaymentStatusText(invoice.payment_status)}
                            color={getPaymentStatusColor(invoice.payment_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title={tr('보기', 'View')}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleViewInvoice(invoice);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            {invoice.payment_status !== 'paid' && (
                              <Tooltip title={tr('정산완료', 'Settlement Complete')}>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await settleInvoice(invoice);
                                  }}
                                >
                                  <TaskAltIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title={tr('인쇄', 'Print')}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingPrintInvoiceId(invoice.id);
                                  void handleViewInvoice(invoice);
                                }}
                              >
                                <PrintIcon />
                              </IconButton>
                            </Tooltip>
                            {invoice.payment_status !== 'paid' && (
                              <Tooltip title={tr('삭제요청', 'Request Delete')}>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteInvoice(invoice.id, invoice.invoice_number, invoice.payment_status);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ?????? */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        </>
      ))}

      {/* ??? */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={deleteDialog.open}
        title={tr('삭제 승인 요청', 'Delete Approval Request')}
        message={deleteDialog.invoiceNumber ? tr(`인보이스 ${deleteDialog.invoiceNumber} 삭제 승인 요청을 등록할까요?`, `Submit delete approval request for invoice ${deleteDialog.invoiceNumber}?`) : tr('이 인보이스 삭제 승인 요청을 등록할까요?', 'Submit delete approval request for this invoice?')}
        confirmText={tr('요청', 'Request')}
        cancelText={tr('취소', 'Cancel')}
        confirmColor="error"
        onConfirm={handleConfirmDeleteInvoice}
        onCancel={() => setDeleteDialog({ open: false, id: null, invoiceNumber: '' })}
      />
    </Box>
  );
};

export default RegularInvoice;