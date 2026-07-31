import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tabs,
  Tab,
  Autocomplete,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsOutlinedLabelProps,
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsBodyPaginationSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsTableScrollSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
} from '../../theme/mvsLayout';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  FormatAlignLeft as FormatAlignLeftIcon,
  FormatAlignCenter as FormatAlignCenterIcon,
  FormatAlignRight as FormatAlignRightIcon,
  Reply as ReplyIcon,
  Create as CreateIcon,
} from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { useStore } from '../../store';
import { approvalService, api } from '../../services/api';
import { filterActiveCompanyUsers, resolveHeaderCompanyInfo, useReferenceDataStore } from '../../store/referenceDataStore';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import SignaturePad from '../../components/Common/SignaturePad';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table as TableExtension } from '@tiptap/extension-table';
import { TableRow as TableRowExtension } from '@tiptap/extension-table-row';
import { TableCell as TableCellExtension } from '@tiptap/extension-table-cell';
import { TableHeader as TableHeaderExtension } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { getUploadUrl } from '../../utils/uploadUrl';
import AuthMedia from '../../components/Common/AuthMedia';
import PromptDialog from '../../components/Common/PromptDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePromptDialog } from '../../hooks/usePromptDialog';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

const WORK_APPROVAL_MENU_ROUTES = ['/work/approval', '/work'] as const;

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          const styles: string[] = [];
          if (attributes.fontSize) {
            styles.push(`font-size: ${attributes.fontSize}`);
          }
          if (attributes.backgroundColor) {
            styles.push(`background-color: ${attributes.backgroundColor}`);
          }
          if (!styles.length) return {};
          return { style: styles.join('; ') };
        },
      },
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null
      }
    };
  },
});

interface ApprovalDocument {
  id: number;
  documentId: string;
  title: string;
  type: 'expense' | 'vacation' | 'purchase' | 'contract' | 'other';
  category: string;
  amount?: number;
  requesterId: number;
  requesterName: string;
  requesterDepartment: string;
  requesterPosition: string;
  description: string;
  attachments: string[];
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currentApproverId?: number;
  currentApproverName?: string;
  approvalFlow: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  comments: ApprovalComment[];
}

interface ApprovalStep {
  id: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  approverDepartment: string;
  approverPosition: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comment?: string;
  signature?: string; // 서명 이미지 (base64)
  escalated?: boolean;
  escalatedToId?: number;
  escalatedToName?: string;
  escalatedAt?: string;
}

interface ApprovalComment {
  id: number;
  userId: number;
  userName: string;
  comment: string;
  createdAt: string;
  isInternal: boolean;
  parentId?: number; // 대댓글을 위한 부모 댓글 ID
  replies?: ApprovalComment[]; // 대댓글 목록
}

// 커스텀 이미지 확장 (리사이즈 지원)
const ResizableImage = Image.extend({
  group: 'block',
  inline: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; height: auto; display: block;`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
    };
  },
});

const APPROVAL_OUTLINED = mvsOutlinedLabelProps;

const APPROVAL_FORM_BORDER = {
  field: 'rgba(15, 23, 42, 0.26)',
  fieldHover: 'rgba(15, 23, 42, 0.38)',
  section: 'rgba(15, 23, 42, 0.22)',
  editorLine: 'rgba(15, 23, 42, 0.16)',
  flowOuter: 'rgba(15, 23, 42, 0.24)',
  flowStep: 'rgba(15, 23, 42, 0.32)',
  flowStepBg: 'rgba(15, 23, 42, 0.045)',
  flowArrow: 'rgba(15, 23, 42, 0.5)',
} as const;

const approvalFilterFieldSx = {
  ...mvsSearchFieldSx,
  ...mvsFilterFieldHeightSx,
} as const;

const approvalWriteFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1,
    bgcolor: 'background.paper',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.field },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.fieldHover },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2, borderColor: 'primary.main' },
  },
} as const;

const ElectronicApproval: React.FC = () => {
  const theme = useTheme();
  const { user } = useStore();
  const approvalMenuFlags = useMenuRoutePermissionFlags(WORK_APPROVAL_MENU_ROUTES);
  const { t, i18n } = useTranslation();
  const approvalFlowLabels = useMemo(
    () => [t('approval.flowDraft'), t('approval.flowApprove')],
    [t]
  );
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';
  const [documents, setDocuments] = useState<ApprovalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<ApprovalDocument[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<ApprovalDocument | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view' | 'received'>('list');
  const [activeTab, setActiveTab] = useState(0); // 0: 받은 결제, 1: 내가 요청한 결제, 2: 결제 문서 작성
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    type: 'expense' as 'expense' | 'vacation' | 'purchase' | 'contract' | 'other',
    category: '',
    amount: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    nextApproverId: null as number | null,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [attachmentPreview, setAttachmentPreview] = useState<{ url: string; label: string } | null>(null);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [escalateTo, setEscalateTo] = useState<number | null>(null);
  const [escalationComment, setEscalationComment] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signingStepId, setSigningStepId] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState('14px');
  const [fontFamily, setFontFamily] = useState('');
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [companyLogo, setCompanyLogo] = useState('');
  const usersRef = useRef<any[]>([]);
  const lastSelectionRef = useRef<any>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const approverInputRef = useRef<HTMLInputElement | null>(null);
  const [draftDocumentId, setDraftDocumentId] = useState<string>('');
  const { dialogState: confirmDialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    dialogState: promptDialogState,
    showPrompt,
    handleConfirm: handlePromptConfirm,
    handleCancel: handlePromptCancel
  } = usePromptDialog();

  // Quill 기반 HTML이 들어와도 본문 내용만 남기도록 정규화
  const normalizeEditorHtml = useCallback((rawHtml: string) => {
    if (!rawHtml) return '';
    if (typeof window === 'undefined') return rawHtml;

    const root = document.createElement('div');
    root.innerHTML = rawHtml;

    root
      .querySelectorAll('.ql-toolbar, .ql-tooltip, .ql-image-resize-toolbar, .ql-image-resize-display')
      .forEach((node) => node.remove());

    root.querySelectorAll('.image-resize-handle, .image-resize-area').forEach((node) => node.remove());

    root.querySelectorAll('.image-wrapper').forEach((wrapper) => {
      const parent = wrapper.parentElement;
      if (!parent) return;
      while (wrapper.firstChild) {
        const child = wrapper.firstChild as Element;
        if (
          child instanceof HTMLElement &&
          (child.classList.contains('image-resize-handle') || child.classList.contains('image-resize-area'))
        ) {
          wrapper.removeChild(child);
          continue;
        }
        parent.insertBefore(child, wrapper);
      }
      wrapper.remove();
    });

    root.querySelectorAll('.ql-container .ql-editor').forEach((editorNode) => {
      const container = editorNode.closest('.ql-container');
      if (!container || !container.parentElement) return;
      const fragment = document.createDocumentFragment();
      while (editorNode.firstChild) {
        fragment.appendChild(editorNode.firstChild);
      }
      container.parentElement.insertBefore(fragment, container);
      container.remove();
    });

    root.querySelectorAll('.ql-editor').forEach((editorNode) => {
      const parent = editorNode.parentElement;
      if (!parent) return;
      while (editorNode.firstChild) {
        parent.insertBefore(editorNode.firstChild, editorNode);
      }
      editorNode.remove();
    });

    return root.innerHTML.trim();
  }, []);

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'resizable-image',
          style: 'display: block; margin: 12px auto; max-width: 100%; clear: both;',
        },
      }),
      TableExtension.configure({
        resizable: true,
      }),
      TableRowExtension,
      TableHeaderExtension,
      TableCellExtension,
      TextStyle,
      FontSize,
      Color.configure({ types: [TextStyle.name] }),
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
        defaultAlignment: 'left',
      }),
    ],
    content: normalizeEditorHtml(formData.description),
    onUpdate: ({ editor }: { editor: any }) => {
      const normalizedHtml = normalizeEditorHtml(editor.getHTML());
      setFormData((prev) => {
        if (prev.description === normalizedHtml) return prev;
        return { ...prev, description: normalizedHtml };
      });
    },
    editorProps: {
      handlePaste: (view: any, event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const result = e.target?.result as string;
                  if (result) {
                    // editor 인스턴스를 사용하여 이미지 삽입
                    const { state, dispatch } = view;
                    const { schema } = state;
                    const imageType = schema.nodes.image;
                    if (imageType) {
                      const { $from } = state.selection;
                      const imageNode = imageType.create({ src: result });
                      // 현재 위치에 이미지 삽입
                      const tr = state.tr.insert($from.pos, imageNode);
                      dispatch(tr);
                    }
                  }
                };
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }
        
        // 엑셀/구글 시트에서 복사한 HTML 테이블 처리
        const htmlData = event.clipboardData?.getData('text/html');
        const textData = event.clipboardData?.getData('text/plain');
        
        if (htmlData && htmlData.includes('<table')) {
          event.preventDefault();
          // HTML 테이블을 파싱하여 Tiptap 테이블로 변환
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlData, 'text/html');
          const table = doc.querySelector('table');
          
          if (table) {
            const rows = Array.from(table.querySelectorAll('tr'));
            const maxCols = Math.max(...rows.map(row => row.querySelectorAll('td, th').length), 1);
            
            if (rows.length > 0 && maxCols > 0 && editor) {
              // HTML 테이블을 직접 삽입 (Tiptap이 자동으로 파싱)
              const tableHTML = table.outerHTML;
              editor.chain()
                .focus()
                .insertContent(tableHTML)
                .run();
              
              return true;
            }
          }
        } else if (textData && textData.includes('\t')) {
          // 탭으로 구분된 텍스트 (엑셀 복사 시)
          event.preventDefault();
          const lines = textData.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
            const maxCols = Math.max(...rows.map(row => row.length), 1);
            
            if (rows.length > 0 && maxCols > 0 && editor) {
              // HTML 테이블 생성
              let tableHTML = '<table><tbody>';
              rows.forEach((row) => {
                tableHTML += '<tr>';
                for (let i = 0; i < maxCols; i++) {
                  const cellText = row[i] || '';
                  tableHTML += `<td>${cellText}</td>`;
                }
                tableHTML += '</tr>';
              });
              tableHTML += '</tbody></table>';
              
              // 테이블 삽입
              editor.chain()
                .focus()
                .insertContent(tableHTML)
                .run();
              
              return true;
            }
          }
        }
        
        return false;
      },
    },
  }, [normalizeEditorHtml]);

  // formData.description이 변경되면 에디터 내용 업데이트 (외부에서 변경된 경우만)
  useEffect(() => {
    const normalizedHtml = normalizeEditorHtml(formData.description || '');
    if (editor && normalizedHtml !== editor.getHTML()) {
      editor.commands.setContent(normalizedHtml, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.description, normalizeEditorHtml]);

  // 설명 에디터 이미지: 우하단 핸들 드래그로 크기 조절
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom as HTMLElement;
    editorElement.style.position = 'relative';

    const handle = document.createElement('div');
    handle.className = 'editor-image-resize-handle';
    editorElement.appendChild(handle);

    let activeImage: HTMLImageElement | null = null;
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let startHeight = 0;
    let aspectRatio = 1;

    const hideHandle = () => {
      handle.style.display = 'none';
      if (activeImage) activeImage.classList.remove('editor-image-active');
      activeImage = null;
    };

    const placeHandle = () => {
      if (!activeImage || !editorElement.contains(activeImage)) {
        hideHandle();
        return;
      }
      const editorRect = editorElement.getBoundingClientRect();
      const imgRect = activeImage.getBoundingClientRect();
      handle.style.display = 'block';
      handle.style.left = `${imgRect.right - editorRect.left - 8 + editorElement.scrollLeft}px`;
      handle.style.top = `${imgRect.bottom - editorRect.top - 8 + editorElement.scrollTop}px`;
    };

    const showHandle = (img: HTMLImageElement) => {
      if (activeImage && activeImage !== img) {
        activeImage.classList.remove('editor-image-active');
      }
      activeImage = img;
      activeImage.classList.add('editor-image-active');
      placeHandle();
    };

    const onEditorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const img = target?.closest('img') as HTMLImageElement | null;
      if (img && editorElement.contains(img)) {
        showHandle(img);
        return;
      }
      if (target && handle.contains(target)) return;
      hideHandle();
    };

    const onHandleMouseDown = (event: MouseEvent) => {
      if (!activeImage) return;
      event.preventDefault();
      event.stopPropagation();
      isResizing = true;
      startX = event.clientX;
      startWidth = activeImage.offsetWidth;
      startHeight = activeImage.offsetHeight;
      aspectRatio = activeImage.naturalWidth && activeImage.naturalHeight
        ? activeImage.naturalWidth / activeImage.naturalHeight
        : startWidth / Math.max(startHeight, 1);
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isResizing || !activeImage) return;
      const diffX = event.clientX - startX;
      const maxWidth = editorElement.clientWidth - 24;
      const nextWidth = Math.max(60, Math.min(startWidth + diffX, maxWidth));
      const nextHeight = Math.max(40, Math.round(nextWidth / Math.max(aspectRatio, 0.1)));
      activeImage.style.width = `${nextWidth}px`;
      activeImage.style.height = `${nextHeight}px`;
      activeImage.setAttribute('width', `${nextWidth}`);
      activeImage.setAttribute('height', `${nextHeight}`);
      placeHandle();
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (!activeImage) return;
      const pos = editor.view.posAtDOM(activeImage, 0);
      const node = editor.state.doc.nodeAt(pos);
      if (!node || node.type.name !== 'image') return;

      const width = activeImage.getAttribute('width') || `${activeImage.offsetWidth}`;
      const height = activeImage.getAttribute('height') || `${activeImage.offsetHeight}`;
      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        width,
        height
      });
      editor.view.dispatch(tr);
      placeHandle();
    };

    const mutationObserver = new MutationObserver(() => {
      if (activeImage && !editorElement.contains(activeImage)) {
        hideHandle();
      } else {
        placeHandle();
      }
    });
    mutationObserver.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'width', 'height']
    });

    editorElement.addEventListener('click', onEditorClick);
    editorElement.addEventListener('scroll', placeHandle, true);
    handle.addEventListener('mousedown', onHandleMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', placeHandle);

    return () => {
      mutationObserver.disconnect();
      editorElement.removeEventListener('click', onEditorClick);
      editorElement.removeEventListener('scroll', placeHandle, true);
      handle.removeEventListener('mousedown', onHandleMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', placeHandle);
      handle.remove();
      if (activeImage) activeImage.classList.remove('editor-image-active');
    };
  }, [editor]);

  // 표 리사이즈 핸들 추가
  useEffect(() => {
    if (!editor) return;

    const addTableResizeHandles = () => {
      const editorElement = editor.view.dom;
      const tables = editorElement.querySelectorAll('table');
      
      tables.forEach((table) => {
        // 이미 핸들이 추가된 표는 건너뛰기
        if (table.querySelector('.table-col-resize-handle')) return;
        
        const tableElement = table as HTMLTableElement;
        const rows = tableElement.querySelectorAll('tr');
        if (rows.length === 0) return;

        // 열 너비 조정 핸들 추가
        const firstRow = rows[0] as HTMLTableRowElement;
        const cells = firstRow.querySelectorAll('td, th');
        
        cells.forEach((cell, colIndex) => {
          const cellElement = cell as HTMLTableCellElement;
          const colResizeHandle = document.createElement('div');
          colResizeHandle.className = 'table-col-resize-handle';
          colResizeHandle.style.cssText = `
            position: absolute;
            top: 0;
            right: -5px;
            width: 10px;
            height: 100%;
            cursor: col-resize;
            z-index: 1000;
            background: transparent;
            transition: background 0.2s;
          `;
          
          colResizeHandle.addEventListener('mouseenter', () => {
            colResizeHandle.style.background = 'rgba(25, 118, 210, 0.3)';
          });
          colResizeHandle.addEventListener('mouseleave', () => {
            colResizeHandle.style.background = 'transparent';
          });

          let isResizing = false;
          let startX = 0;
          let startWidth = 0;
          let affectedCells: HTMLTableCellElement[] = [];

          const startResize = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            
            // 같은 열의 모든 셀 찾기
            affectedCells = [];
            rows.forEach((row) => {
              const cell = row.querySelectorAll('td, th')[colIndex] as HTMLTableCellElement;
              if (cell) {
                startWidth = cell.offsetWidth;
                affectedCells.push(cell);
              }
            });
            
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
          };

          const resize = (e: MouseEvent) => {
            if (!isResizing) return;
            const diff = e.clientX - startX;
            const newWidth = Math.max(30, startWidth + diff);
            
            // 같은 열의 모든 셀 너비 조정
            affectedCells.forEach((cell) => {
              cell.style.width = `${newWidth}px`;
              cell.style.minWidth = `${newWidth}px`;
            });
          };

          const stopResize = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            
            // 에디터에 변경사항 반영
            if (editor) {
              editor.view.dispatch(editor.view.state.tr);
            }
          };

          colResizeHandle.addEventListener('mousedown', startResize);
          
          // 셀에 relative positioning 추가
          if (getComputedStyle(cellElement).position === 'static') {
            cellElement.style.position = 'relative';
          }
          
          cellElement.appendChild(colResizeHandle);
        });

        // 행 높이 조정 핸들 추가
        rows.forEach((row, rowIndex) => {
          const rowElement = row as HTMLTableRowElement;
          const rowResizeHandle = document.createElement('div');
          rowResizeHandle.className = 'table-row-resize-handle';
          rowResizeHandle.style.cssText = `
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 100%;
            height: 10px;
            cursor: row-resize;
            z-index: 1000;
            background: transparent;
            transition: background 0.2s;
          `;
          
          rowResizeHandle.addEventListener('mouseenter', () => {
            rowResizeHandle.style.background = 'rgba(25, 118, 210, 0.3)';
          });
          rowResizeHandle.addEventListener('mouseleave', () => {
            rowResizeHandle.style.background = 'transparent';
          });

          let isResizing = false;
          let startY = 0;
          let startHeight = 0;

          const startResize = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            startY = e.clientY;
            startHeight = rowElement.offsetHeight;
            
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
          };

          const resize = (e: MouseEvent) => {
            if (!isResizing) return;
            const diff = e.clientY - startY;
            const newHeight = Math.max(20, startHeight + diff);
            rowElement.style.height = `${newHeight}px`;
            rowElement.style.minHeight = `${newHeight}px`;
          };

          const stopResize = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            
            // 에디터에 변경사항 반영
            if (editor) {
              editor.view.dispatch(editor.view.state.tr);
            }
          };

          rowResizeHandle.addEventListener('mousedown', startResize);
          
          // 행에 relative positioning 추가
          if (getComputedStyle(rowElement).position === 'static') {
            rowElement.style.position = 'relative';
          }
          
          rowElement.appendChild(rowResizeHandle);
        });
      });
    };

    // 디바운싱을 위한 타이머
    let debounceTimer: NodeJS.Timeout | null = null;
    let isProcessing = false;

    // 표 삽입 시 핸들 추가
    const observer = new MutationObserver((mutations) => {
      if (isProcessing) return;

      const hasTableChange = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeName === 'TABLE') return true;
          if (node.nodeType === 1) {
            return (node as Element).querySelector('table') !== null;
          }
          return false;
        });
      });

      if (hasTableChange) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          isProcessing = true;
          try {
            addTableResizeHandles();
          } finally {
            setTimeout(() => {
              isProcessing = false;
            }, 50);
          }
        }, 200);
      }
    });

    const editorElement = editor.view.dom;
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    // 초기 로드 시 핸들 추가
    setTimeout(addTableResizeHandles, 100);

    return () => {
      observer.disconnect();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [editor]);

  const parseJsonArray = useCallback((value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  const normalizeApprovalStep = useCallback((step: any, userList: any[] = []): ApprovalStep => {
    const approverId = step.approverId ?? step.approver_id;
    const matchedUser = userList.find((u) => u.id === approverId);
    return {
      id: step.id ?? 0,
      stepOrder: step.stepOrder ?? step.step_order ?? 0,
      approverId: Number(approverId),
      approverName: step.approverName ?? step.approver_name ?? matchedUser?.username ?? t('approval.unknownUser'),
      approverDepartment: step.approverDepartment ?? step.approver_department ?? matchedUser?.department ?? '-',
      approverPosition: step.approverPosition ?? step.approver_position ?? matchedUser?.position ?? '-',
      status: step.status || 'pending',
      approvedAt: step.approvedAt ?? step.approved_at,
      comment: step.comment,
      signature: step.signature,
      escalated: step.escalated,
      escalatedToId: step.escalatedToId ?? step.escalated_to_id,
      escalatedToName: step.escalatedToName ?? step.escalated_to_name,
      escalatedAt: step.escalatedAt ?? step.escalated_at,
    };
  }, [t]);

  const mapApprovalFromApi = useCallback((
    d: any,
    userList: any[] = [],
    options?: { normalizeDescription?: boolean }
  ): ApprovalDocument => {
    const rawDescription = d.description || '';
    const rawFlow = parseJsonArray(d.approval_flow);
    return {
      id: d.id,
      documentId: d.document_id || '',
      title: d.title || '',
      type: d.type || 'other',
      category: d.category || '',
      amount: d.amount ? parseFloat(d.amount) : undefined,
      requesterId: d.requester_id,
      requesterName: d.requester?.username || t('approval.unknownUser'),
      requesterDepartment: d.requester?.department || '-',
      requesterPosition: d.requester?.position || '-',
      description: options?.normalizeDescription
        ? normalizeEditorHtml(rawDescription)
        : rawDescription,
      attachments: parseJsonArray(d.attachments),
      status: d.status || 'draft',
      priority: d.priority || 'medium',
      currentApproverId: d.current_approver_id,
      currentApproverName: d.currentApprover?.username,
      approvalFlow: rawFlow.map((step: any) => normalizeApprovalStep(step, userList)),
      createdAt: d.created_at || new Date().toISOString(),
      updatedAt: d.updated_at || new Date().toISOString(),
      dueDate: d.due_date,
      comments: parseJsonArray(d.comments),
    };
  }, [normalizeApprovalStep, normalizeEditorHtml, parseJsonArray, t]);

  const loadApprovalData = useCallback(async () => {
    setError('');
    try {
      const response = await approvalService.getApprovals();
      if (response.success) {
        const documentsData: ApprovalDocument[] = (response.data || []).map((d: any) =>
          mapApprovalFromApi(d, usersRef.current)
        );
        setDocuments(documentsData);
      } else {
        setError(response.message || t('approval.errors.loadList'));
        setDocuments([]);
      }
    } catch (error: any) {
      console.error('전자 결제 목록 조회 오류:', error);
      setError(error.response?.data?.message || t('approval.errors.loadListFailed'));
      setDocuments([]);
    }
  }, [mapApprovalFromApi, t]);

  useEffect(() => {
    if (!editor) return;
    const updateToolbarState = () => {
      const textStyleAttrs = editor.getAttributes('textStyle') || {};
      setFontSize(textStyleAttrs.fontSize || '14px');
      setFontFamily(textStyleAttrs.fontFamily || '');
      setFontColor(textStyleAttrs.color || '#000000');
      setBackgroundColor(textStyleAttrs.backgroundColor || '#ffffff');
      lastSelectionRef.current = editor.state.selection;
    };
    updateToolbarState();
    editor.on('selectionUpdate', updateToolbarState);
    editor.on('transaction', updateToolbarState);
    return () => {
      editor.off('selectionUpdate', updateToolbarState);
      editor.off('transaction', updateToolbarState);
    };
  }, [editor]);

  useEffect(() => {
    setEscalateTo(null);
    setEscalationComment('');
  }, [selectedDocument?.id]);

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await useReferenceDataStore.getState().fetchUsers(
        user?.company_id ? { company_id: Number(user.company_id) } : undefined
      );
      const filteredUsers = filterActiveCompanyUsers(allUsers, {
        companyId: user?.company_id != null ? Number(user.company_id) : undefined,
        excludeUserId: user?.id != null ? Number(user.id) : undefined,
      });
      setUsers(filteredUsers);
    } catch (error: any) {
      console.error('사용자 목록 조회 오류:', error);
    }
  }, [user]);


  const filterDocuments = useCallback(() => {
    let filtered = documents;
    const isPrivilegedUser = user?.role === 'root' || user?.role === 'audit';

    // 탭에 따라 필터링
    if (activeTab === 1) {
      // 내가 요청한 결제 (root/audit는 전체 조회)
      if (!isPrivilegedUser) {
        filtered = filtered.filter(doc => doc.requesterId === user?.id);
      }
    } else if (activeTab === 0) {
      // 받은 결제 (root/audit는 전체 승인대기 조회)
      if (isPrivilegedUser) {
        filtered = filtered.filter(
          (doc) => doc.status === 'submitted' || doc.status === 'in_review'
        );
      } else {
        filtered = filtered.filter(doc =>
          doc.currentApproverId === user?.id &&
          (doc.status === 'submitted' || doc.status === 'in_review')
        );
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(doc => doc.priority === priorityFilter);
    }

    // 정렬 처리
    if (orderBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[orderBy as keyof ApprovalDocument];
        let bValue: any = b[orderBy as keyof ApprovalDocument];
        
        // 숫자 타입 처리
        if (orderBy === 'amount') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }
        
        // 날짜 타입 처리
        if (orderBy === 'createdAt') {
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
        }
        
        // 문자열 타입 처리
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter, typeFilter, priorityFilter, activeTab, user?.id, user?.role, orderBy, order]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadApprovalData();
  }, [loadApprovalData]);

  useEffect(() => {
    if (users.length === 0) return;
    setDocuments((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((doc) => {
        const nextFlow = doc.approvalFlow.map((step) => normalizeApprovalStep(step, users));
        const flowUnchanged = nextFlow.every(
          (step, index) =>
            step.approverName === doc.approvalFlow[index]?.approverName &&
            step.approverDepartment === doc.approvalFlow[index]?.approverDepartment &&
            step.approverPosition === doc.approvalFlow[index]?.approverPosition
        );
        if (flowUnchanged) return doc;
        changed = true;
        return { ...doc, approvalFlow: nextFlow };
      });
      return changed ? next : prev;
    });
  }, [users, normalizeApprovalStep]);

  useEffect(() => {
    if (!user) {
      setCompanyLogo('');
      return;
    }
    resolveHeaderCompanyInfo(user).then((info) => setCompanyLogo(info.logo || ''));
  }, [user?.company_id, user?.id]);

  useEffect(() => {
    filterDocuments();
  }, [filterDocuments]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    // 정렬 변경 시 필터 재적용
    setTimeout(() => filterDocuments(), 0);
  };

  const pillChip = (label: string, tone: 'neutral' | 'info' | 'warn' | 'ok' | 'bad' | 'teal') => {
    const light = theme.palette.mode === 'light';
    const tones: Record<
      'neutral' | 'info' | 'warn' | 'ok' | 'bad' | 'teal',
      { border: string; bg: string; color: string }
    > = {
      neutral: {
        border: light ? 'rgba(15, 23, 42, 0.12)' : String(theme.palette.divider),
        bg: light ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.06),
        color: theme.palette.text.secondary,
      },
      info: {
        border: alpha(theme.palette.info.main, light ? 0.22 : 0.4),
        bg: alpha(theme.palette.info.main, light ? 0.06 : 0.1),
        color: theme.palette.info.dark,
      },
      warn: {
        border: alpha(theme.palette.warning.main, light ? 0.32 : 0.45),
        bg: alpha(theme.palette.warning.main, light ? 0.07 : 0.12),
        color: theme.palette.warning.dark,
      },
      ok: {
        border: alpha(theme.palette.success.main, light ? 0.28 : 0.4),
        bg: alpha(theme.palette.success.main, light ? 0.06 : 0.1),
        color: theme.palette.success.dark,
      },
      bad: {
        border: alpha(theme.palette.error.main, light ? 0.28 : 0.4),
        bg: alpha(theme.palette.error.main, light ? 0.06 : 0.1),
        color: theme.palette.error.dark,
      },
      teal: {
        border: alpha(theme.palette.primary.main, light ? 0.22 : 0.38),
        bg: alpha(theme.palette.primary.main, light ? 0.06 : 0.1),
        color: theme.palette.primary.dark,
      },
    };
    const { border, bg, color } = tones[tone];
    return (
      <Chip
        label={label}
        size="small"
        sx={{
          height: 22,
          borderRadius: '7px',
          fontWeight: 500,
          fontSize: '0.65rem',
          '& .MuiChip-label': {
            px: 0.8,
          },
          border: `1px solid ${border}`,
          bgcolor: bg,
          color,
        }}
      />
    );
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return pillChip(t('approval.draft'), 'neutral');
      case 'submitted':
        return pillChip(t('approval.submitted'), 'info');
      case 'in_review':
        return pillChip(t('approval.inReview'), 'warn');
      case 'approved':
        return pillChip(t('approval.approved'), 'ok');
      case 'rejected':
        return pillChip(t('approval.rejected'), 'bad');
      case 'cancelled':
        return pillChip(t('approval.cancelled'), 'neutral');
      default:
        return pillChip('Unknown', 'neutral');
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return pillChip(t('approval.low'), 'neutral');
      case 'medium':
        return pillChip(t('approval.normal'), 'info');
      case 'high':
        return pillChip(t('approval.high'), 'warn');
      case 'urgent':
        return pillChip(t('approval.urgent'), 'bad');
      default:
        return pillChip('Unknown', 'neutral');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expense':
        return t('approval.expense');
      case 'vacation':
        return t('approval.vacation');
      case 'purchase':
        return t('approval.purchase');
      case 'contract':
        return t('approval.contract');
      case 'other':
        return t('approval.other');
      default:
        return 'Unknown';
    }
  };

  const getTypeChip = (type: string) => {
    switch (type) {
      case 'expense':
        return pillChip(getTypeLabel(type), 'ok');
      case 'purchase':
        return pillChip(getTypeLabel(type), 'info');
      case 'contract':
        return pillChip(getTypeLabel(type), 'warn');
      case 'vacation':
        return pillChip(getTypeLabel(type), 'teal');
      case 'other':
      default:
        return pillChip(getTypeLabel(type), 'neutral');
    }
  };

  const IMAGE_ATTACHMENT_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i;

  const getAttachmentLabel = (file: string | { name?: string; storedName?: string }) =>
    typeof file === 'string' ? file : (file.name || file.storedName || 'attachment');

  const getAttachmentUrl = (file: string | { name?: string; storedName?: string }) => {
    const fileName = typeof file === 'string' ? file : (file.storedName || file.name || '');
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
      return fileName;
    }
    return getUploadUrl(fileName.includes('/') ? fileName : `approvals/${fileName}`);
  };

  const isImageAttachment = (file: string | { name?: string; storedName?: string }) => {
    const label = getAttachmentLabel(file);
    const stored = typeof file === 'string' ? file : (file.storedName || file.name || '');
    return IMAGE_ATTACHMENT_EXT.test(label) || IMAGE_ATTACHMENT_EXT.test(stored);
  };

  const handleDownloadAttachment = (file: string | { name?: string; storedName?: string }) => {
    const url = getAttachmentUrl(file);
    const downloadName = getAttachmentLabel(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewAttachment = (file: string | { name?: string; storedName?: string }) => {
    setAttachmentPreview({
      url: getAttachmentUrl(file),
      label: getAttachmentLabel(file),
    });
  };

  const handleOpenAttachment = (file: string | { name?: string; storedName?: string }) => {
    if (isImageAttachment(file)) {
      handlePreviewAttachment(file);
      return;
    }
    handleDownloadAttachment(file);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const generateDocumentId = () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `APP-${datePart}-${randomPart}`;
  };

  const buildApprovalFlow = (nextApproverId: number | null) => {
    if (!nextApproverId) return [];
    const approver = users.find(u => u.id === nextApproverId);
    return [
      {
        id: 1,
        stepOrder: 1,
        approverId: nextApproverId,
        approverName: approver?.username || t('approval.unknownUser'),
        approverDepartment: approver?.department || '-',
        approverPosition: approver?.position || '-',
        status: 'pending'
      }
    ];
  };

  const getEscalationCount = (document: ApprovalDocument) =>
    document.approvalFlow.filter(step => step.escalated).length;

  const resolveApprovalFlow = useCallback((document: ApprovalDocument): ApprovalStep[] => {
    const flow = document.approvalFlow.map((step) => normalizeApprovalStep(step, users));
    if (flow.length > 0) return flow;
    if (document.currentApproverId) {
      const matchedUser = users.find((u) => u.id === document.currentApproverId);
      return [{
        id: 1,
        stepOrder: 1,
        approverId: document.currentApproverId,
        approverName: document.currentApproverName ?? matchedUser?.username ?? t('approval.unknownUser'),
        approverDepartment: matchedUser?.department ?? '-',
        approverPosition: matchedUser?.position ?? '-',
        status: document.status === 'approved' ? 'approved' : 'pending',
      }];
    }
    return [];
  }, [normalizeApprovalStep, t, users]);

  const getApprovalDisplayName = (document: ApprovalDocument) => {
    const flow = resolveApprovalFlow(document);
    const pendingStep = flow.find(step => step.status === 'pending');
    if (pendingStep) return pendingStep.approverName;
    if (document.status === 'approved') {
      const lastApproved = [...flow].reverse().find(step => step.status === 'approved');
      return lastApproved?.approverName || document.currentApproverName || '-';
    }
    return flow[0]?.approverName || document.currentApproverName || '-';
  };

  const getStepStatusLabel = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'approved': return t('approval.detail.stepApproved');
      case 'pending': return t('approval.detail.stepPending');
      case 'rejected': return t('approval.detail.stepRejected');
      case 'skipped': return t('approval.detail.stepSkipped');
      default: return status;
    }
  };

  const getStepStatusColor = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'skipped': return 'info';
      default: return 'default';
    }
  };

  const renderApprovalFlowSummary = (document: ApprovalDocument) => (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: 1.25,
      alignItems: 'center',
      border: `1px solid ${APPROVAL_FORM_BORDER.flowOuter}`,
      borderRadius: '14px',
      p: 1.5,
      bgcolor: 'background.paper',
      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
    }}>
      <Box sx={{
        border: `1.5px dashed ${APPROVAL_FORM_BORDER.flowStep}`,
        borderRadius: '12px',
        minHeight: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: APPROVAL_FORM_BORDER.flowStepBg,
      }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {t('approval.flowDraft')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {document.requesterName}
        </Typography>
      </Box>
      <ArrowForwardIcon sx={{ color: APPROVAL_FORM_BORDER.flowArrow, fontSize: 22 }} />
      <Box sx={{
        border: `1.5px dashed ${APPROVAL_FORM_BORDER.flowStep}`,
        borderRadius: '12px',
        minHeight: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: APPROVAL_FORM_BORDER.flowStepBg,
      }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {t('approval.flowApprove')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {getApprovalDisplayName(document)}
        </Typography>
      </Box>
    </Box>
  );

  const renderApprovalFlowTimeline = (document: ApprovalDocument) => {
    const flow = resolveApprovalFlow(document);
    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
          {t('approval.detail.flowPath')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
              {document.requesterName.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1, pb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{document.requesterName}</Typography>
                <Chip label={t('approval.flowDraft')} size="small" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {document.requesterDepartment} {document.requesterPosition}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {t('approval.detail.flowSubmittedAt')}: {formatDateTime(document.createdAt)}
              </Typography>
            </Box>
          </Box>
          {flow.map((step, idx) => (
            <Box key={`${step.id}-${idx}`} sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{
                width: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <Box sx={{ width: 2, flex: 1, minHeight: 12, bgcolor: APPROVAL_FORM_BORDER.flowStep }} />
              </Box>
              <Box sx={{ flex: 1, pb: idx < flow.length - 1 ? 1.5 : 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {idx === 0
                    ? t('approval.detail.flowRequestTo', { name: step.approverName })
                    : t('approval.detail.flowForwardedTo', { name: step.approverName })}
                </Typography>
                <Box sx={{
                  p: 1.25,
                  border: `1px solid ${APPROVAL_FORM_BORDER.flowOuter}`,
                  borderRadius: 1.5,
                  bgcolor: APPROVAL_FORM_BORDER.flowStepBg,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.approverName}</Typography>
                    <Chip label={t('approval.flowApprove')} size="small" variant="outlined" />
                    <Chip
                      label={getStepStatusLabel(step.status)}
                      size="small"
                      color={getStepStatusColor(step.status) as 'success' | 'warning' | 'error' | 'info' | 'default'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {step.approverDepartment} {step.approverPosition}
                  </Typography>
                  {step.escalated && step.escalatedToName && (
                    <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5 }}>
                      {t('approval.detail.flowForwardedTo', { name: step.escalatedToName })}
                    </Typography>
                  )}
                  {step.approvedAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {t('approval.detail.approvalDate')}: {formatDateTime(step.approvedAt)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
          {flow.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ pl: 5.5 }}>
              {t('approval.detail.noApprover')}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const handleViewDocument = async (document: ApprovalDocument) => {
    setEscalateTo(null);
    setEscalationComment('');
    setSelectedDocument(document);
    setDetailDialogOpen(true);
    try {
      const response = await approvalService.getApproval(document.id);
      if (response.success && response.data) {
        setSelectedDocument(mapApprovalFromApi(response.data, users, { normalizeDescription: true }));
      }
    } catch (error) {
      console.error('결재 문서 상세 조회 오류:', error);
    }
  };

  const handleAdd = () => {
    setSelectedDocument(null);
    const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDraftDocumentId(generateDocumentId());
    setExistingAttachments([]);
    setFormData({
      title: '',
      type: 'expense',
      category: t('approval.categoryGeneral'),
      amount: '',
      description: '',
      priority: 'medium',
      nextApproverId: null,
      dueDate: defaultDueDate
    });
    if (editor) {
      editor.commands.clearContent();
    }
    setAttachedFiles([]);
    setViewMode('create');
    setActiveTab(2);
  };

  const handleEditDocument = (document: ApprovalDocument) => {
    const normalizedDescription = normalizeEditorHtml(document.description || '');
    setSelectedDocument(document);
    setExistingAttachments(parseJsonArray(document.attachments));
    setFormData({
      title: document.title,
      type: document.type,
      category: document.category,
      amount: document.amount?.toString() || '',
      description: normalizedDescription,
      priority: document.priority,
      nextApproverId: document.approvalFlow[0]?.approverId || null,
      dueDate: document.dueDate || ''
    });
    if (editor) {
      editor.commands.setContent(normalizedDescription, false);
    }
    setAttachedFiles([]); // 편집 시에는 새 파일만 첨부 가능
    setViewMode('edit');
    setActiveTab(2);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  };

  const handleFileRemove = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExistingFileRemove = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.title) {
      setError(t('approval.validation.titleRequired'));
      titleInputRef.current?.focus();
      return;
    }

    if (!formData.description) {
      setError(t('approval.validation.descriptionRequired'));
      editor?.chain().focus().run();
      return;
    }

    if (!formData.nextApproverId) {
      setError(t('approval.validation.approverRequired'));
      approverInputRef.current?.focus();
      return;
    }

    setSaving(true);
    setError('');
    try {
      // 파일 업로드 처리
      const uploadedFiles: Array<{ name: string; storedName: string }> = [];
      if (attachedFiles.length > 0) {
        const formData = new FormData();
        attachedFiles.forEach((file) => formData.append('files', file));
        const uploadResponse = await api.post('/work/approvals/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadResponse.data?.success) {
          uploadedFiles.push(...(uploadResponse.data.data?.files || []));
        }
      }

      const approvalFlow = buildApprovalFlow(formData.nextApproverId);

      const combinedAttachments = [...existingAttachments, ...uploadedFiles];
      const approvalData: any = {
        title: formData.title,
        type: formData.type,
        category: formData.category,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        description: formData.description,
        priority: formData.priority,
        approval_flow: approvalFlow,
        due_date: formData.dueDate || undefined,
        attachments: combinedAttachments.length > 0
          ? combinedAttachments
          : undefined
      };

      if (!selectedDocument) {
        approvalData.document_id = draftDocumentId || generateDocumentId();
      }

      let response;
      if (selectedDocument) {
        // 편집 시에는 첨부파일이 0개여도 빈 배열로 전달해 삭제 반영
        if (combinedAttachments.length === 0) {
          approvalData.attachments = [];
        }
        response = await approvalService.updateApproval(selectedDocument.id, approvalData);
      } else {
        response = await approvalService.createApproval(approvalData);
        if (response.success && response.data?.id) {
          const submitResponse = await approvalService.submitApproval(response.data.id);
          if (!submitResponse.success) {
            setError(submitResponse.message || t('approval.errors.submitFailed'));
            return;
          }
        }
      }

      if (response.success) {
        setSuccess(selectedDocument ? t('approval.toast.documentUpdated') : t('approval.toast.documentCreated'));
        setViewMode('list');
        setActiveTab(1); // 내가 요청한 결제 탭으로 이동
        setSelectedDocument(null);
        loadApprovalData();
      } else {
        setError(response.message || t('approval.errors.saveFailed'));
      }
    } catch (error: any) {
      console.error('결재 문서 저장 오류:', error);
      setError(error.response?.data?.message || t('approval.errors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = (id: number) => {
    showConfirm(
      t('approval.confirmDeleteMessage', { defaultValue: '정말로 이 결재 문서를 삭제하시겠습니까?' }),
      () => {
        void (async () => {
          try {
            const response = await approvalService.deleteApproval(id);
            if (response.success) {
              setSuccess(t('approval.toast.documentDeleted'));
              loadApprovalData();
            } else {
              setError(response.message || t('approval.errors.deleteFailed'));
            }
          } catch (error: any) {
            console.error('삭제 오류:', error);
            setError(error.response?.data?.message || t('approval.errors.deleteError'));
          }
        })();
      },
      {
        title: t('approval.confirmDeleteTitle', { defaultValue: '삭제 확인' }),
        confirmColor: 'error',
        confirmText: t('common.delete'),
        cancelText: t('common.cancel')
      }
    );
  };

  const handleApproveDocument = async (id: number) => {
    try {
      const response = await approvalService.approveApproval(id);
      if (response.success) {
        setSuccess(t('approval.toast.documentApproved'));
        loadApprovalData();
        if (detailDialogOpen && selectedDocument?.id === id) {
          setDetailDialogOpen(false);
        }
        if (viewMode === 'view' && selectedDocument?.id === id) {
          setViewMode('list');
        }
      } else {
        setError(response.message || t('approval.errors.approveFailed'));
      }
    } catch (error: any) {
      console.error('결재 승인 오류:', error);
      setError(error.response?.data?.message || t('approval.errors.approveError'));
    }
  };

  const handleRejectDocument = (id: number) => {
    showPrompt(
      '',
      (comment) => {
        void (async () => {
          try {
            const response = await approvalService.rejectApproval(id, comment);
            if (response.success) {
              setSuccess(t('approval.toast.documentRejected'));
              loadApprovalData();
              if (detailDialogOpen && selectedDocument?.id === id) {
                setDetailDialogOpen(false);
              }
              if (viewMode === 'view' && selectedDocument?.id === id) {
                setViewMode('list');
              }
            } else {
              setError(response.message || t('approval.errors.rejectFailed'));
            }
          } catch (error: any) {
            console.error('결재 반려 오류:', error);
            setError(error.response?.data?.message || t('approval.errors.rejectError'));
          }
        })();
      },
      {
        messageKey: 'approval.validation.rejectionReasonPrompt',
        titleKey: 'approval.rejectDialogTitle',
        labelKey: 'approval.rejectReasonLabel',
        placeholderKey: 'approval.rejectReasonPlaceholder',
        multiline: true,
        minRows: 3,
        confirmTextKey: 'approval.reject',
        cancelTextKey: 'common.cancel',
      }
    );
  };

  const handleEscalateDocument = async () => {
    if (!selectedDocument) return;
    if (!escalateTo) {
      setError(t('approval.validation.approverRequired'));
      return;
    }
    setEscalating(true);
    try {
      const response = await approvalService.escalateApproval(selectedDocument.id, {
        next_approver_id: escalateTo,
        comment: escalationComment
      });
      if (response.success) {
        setSuccess(t('approval.toast.documentEscalated'));
        const updated = await approvalService.getApproval(selectedDocument.id);
        if (updated.success) {
          setSelectedDocument(mapApprovalFromApi(updated.data, users));
        }
        loadApprovalData();
        setEscalateTo(null);
        setEscalationComment('');
      } else {
        setError(response.message || t('approval.errors.escalateFailed'));
      }
    } catch (error: any) {
      console.error('에스컬레이션 오류:', error);
      setError(error.response?.data?.message || t('approval.errors.escalateError'));
    } finally {
      setEscalating(false);
    }
  };

  const renderEscalationSection = (document: ApprovalDocument) => {
    const escalationCount = getEscalationCount(document);
    const escalationLimitReached = escalationCount >= 4;
    const isCurrentApprover = document.currentApproverId === user?.id;
    const canEscalate =
      isCurrentApprover &&
      (document.status === 'submitted' || document.status === 'in_review') &&
      !escalationLimitReached;

    if (!isCurrentApprover) return null;

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
          {t('approval.detail.escalationSection')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('approval.forwardHint')}
        </Typography>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.04),
            borderColor: APPROVAL_FORM_BORDER.flowOuter,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                options={users.filter((u) => u.id !== user?.id && u.id !== document.requesterId)}
                getOptionLabel={(option) =>
                  `${option.username}${option.department ? ` (${option.department})` : ''}`
                }
                value={users.find((u) => u.id === escalateTo) || null}
                onChange={(_event, newValue) => setEscalateTo(newValue?.id || null)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('approval.escalateTo')}
                    placeholder={t('approval.selectApprover')}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        bgcolor: 'background.paper',
                      },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('approval.escalationReason')}
                value={escalationComment}
                onChange={(e) => setEscalationComment(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color={escalationLimitReached ? 'error.main' : 'text.secondary'}>
                {t('approval.escalationCount', { current: escalationCount, max: 4 })}
              </Typography>
              <Button
                variant="contained"
                color="info"
                startIcon={escalating ? <CircularProgress size={18} color="inherit" /> : <ReplyIcon />}
                onClick={handleEscalateDocument}
                disabled={!canEscalate || !escalateTo || escalating}
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
              >
                {escalating ? t('approval.saving') : t('approval.escalate')}
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Box>
    );
  };

  const handleAddComment = async (documentId: number, parentId?: number) => {
    const commentText = parentId ? replyText : newComment;
    if (!commentText.trim()) return;

    try {
      // 댓글 추가 API 호출
      const response = await api.post(`/work/approvals/${documentId}/comments`, {
        comment: commentText,
        parentId: parentId || null
      });

      if (response.data.success) {
        setSuccess(parentId ? t('approval.toast.replyAdded') : t('approval.toast.commentAdded'));
        setNewComment('');
        setReplyText('');
        setReplyingTo(null);
        loadApprovalData();
        if (selectedDocument?.id === documentId) {
          // 선택된 문서의 댓글 목록 업데이트
          const updatedDoc = await approvalService.getApproval(documentId);
          if (updatedDoc.success) {
            setSelectedDocument(updatedDoc.data);
          }
        }
      } else {
        setError(response.data.message || t('approval.errors.commentAddFailed'));
      }
    } catch (error: any) {
      console.error('댓글 추가 오류:', error);
      setError(error.response?.data?.message || t('approval.errors.commentAddError'));
    }
  };

  const handleOpenSignatureDialog = (stepId: number) => {
    setSigningStepId(stepId);
    setSignatureDialogOpen(true);
  };

  const handleSaveSignature = async (signature: string) => {
    if (selectedDocument && signingStepId !== null) {
      // 서명 저장 후 승인 처리
      try {
        const response = await approvalService.approveApproval(selectedDocument.id, undefined, signature);
        if (response.success) {
          setSuccess(t('approval.toast.documentApproved'));
          setSignatureDialogOpen(false);
          setSigningStepId(null);
          loadApprovalData();
          if (viewMode === 'view' && selectedDocument?.id === selectedDocument.id) {
            setViewMode('list');
          }
        } else {
          setError(response.message || t('approval.errors.approveFailed'));
        }
      } catch (error: any) {
        console.error('결재 승인 오류:', error);
        setError(error.response?.data?.message || t('approval.errors.approveError'));
      }
    }
  };

  const pendingCount = documents.filter(doc => doc.status === 'submitted' || doc.status === 'in_review').length;
  const approvedCount = documents.filter(doc => doc.status === 'approved').length;
  const rejectedCount = documents.filter(doc => doc.status === 'rejected').length;
  const totalAmount = documents
    .filter(doc => doc.amount && doc.status === 'approved')
    .reduce((sum, doc) => sum + (doc.amount || 0), 0);

  const paginatedDocuments = filteredDocuments.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const renderAttachmentPreviewDialog = () => (
    <Dialog
      open={!!attachmentPreview}
      onClose={() => setAttachmentPreview(null)}
      maxWidth="lg"
      fullWidth
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {attachmentPreview?.label || t('approval.detail.imagePreview')}
        </Typography>
        <IconButton aria-label={t('common.close')} onClick={() => setAttachmentPreview(null)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'grey.100',
          minHeight: 280,
          p: 2,
        }}
      >
        {attachmentPreview?.url ? (
          <Box
            component="img"
            src={attachmentPreview.url}
            alt={attachmentPreview.label}
            sx={{
              maxWidth: '100%',
              maxHeight: '75vh',
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={() => setAttachmentPreview(null)} variant="outlined">
          {t('common.close')}
        </Button>
        {attachmentPreview ? (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const link = document.createElement('a');
              link.href = attachmentPreview.url;
              link.download = attachmentPreview.label;
              link.target = '_blank';
              link.rel = 'noopener';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            {t('approval.detail.downloadFile')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );

  if (viewMode === 'view' && selectedDocument) {
    const isCurrentApprover = selectedDocument.currentApproverId === user?.id;

    return (
      <Box sx={{
        ...mvsPageRootSx,
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          backgroundColor: 'background.paper',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.divider, 0.9),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.text.primary, 0.12),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: 1,
          },
        },
        '& .MuiInputBase-input::placeholder': {
          color: '#9CA3AF',
          opacity: 1,
        },
      }}>
        <MvsPageHeader
          title={t('approval.detailPageTitle')}
          actions={
            <Button
              variant="outlined"
              onClick={() => setViewMode('list')}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('approval.backToList')}
            </Button>
          }
        />

        <Card elevation={0} sx={mvsBodyCardSx}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedDocument.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {t('approval.documentNumber')}: {selectedDocument.documentId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedDocument.status)}
                  {getPriorityChip(selectedDocument.priority)}
                  {getTypeChip(selectedDocument.type)}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {selectedDocument.amount && (
                  <Typography variant="h4" color="primary.main">
                    Rs. {selectedDocument.amount.toLocaleString()}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {t('approval.requestDate')}: {formatDateTime(selectedDocument.createdAt)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 신청자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('approval.applicantInfo')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedDocument.requesterName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDocument.requesterPosition} • {selectedDocument.requesterDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 문서 내용 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('approval.detail.documentContent')}</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box
                  sx={{
                    '& img': {
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block'
                    },
                    '& table': {
                      width: '100%',
                      borderCollapse: 'collapse'
                    },
                    '& td, & th': {
                      border: '1px solid #ddd',
                      padding: '6px'
                    }
                  }}
                  dangerouslySetInnerHTML={{
                    __html: normalizeEditorHtml(selectedDocument.description || '<p>-</p>')
                  }}
                />
                {(() => {
                  const attachmentList = Array.isArray(selectedDocument.attachments)
                    ? selectedDocument.attachments
                    : parseJsonArray(selectedDocument.attachments as any);
                  if (!attachmentList.length) return null;
                  return (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>{t('approval.detail.attachmentsLabel')}</Typography>
                      <List dense>
                        {attachmentList.map((file: any, index: number) => {
                          const label = getAttachmentLabel(file);
                          const isImage = isImageAttachment(file);
                          return (
                            <ListItem
                              key={`${label}-${index}`}
                              secondaryAction={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                  {isImage ? (
                                    <IconButton
                                      size="small"
                                      aria-label={t('approval.detail.imagePreview')}
                                      onClick={() => handlePreviewAttachment(file)}
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  ) : null}
                                  <IconButton size="small" onClick={() => handleDownloadAttachment(file)}>
                                    <DownloadIcon />
                                  </IconButton>
                                </Box>
                              }
                            >
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      cursor: 'pointer',
                                      color: isImage ? 'primary.main' : 'inherit',
                                      '&:hover': { textDecoration: 'underline' },
                                    }}
                                    onClick={() => handleOpenAttachment(file)}
                                  >
                                    {label}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    </Box>
                  );
                })()}
              </Card>
            </Box>

            {/* 결재 흐름 - 작성 → 승인 2단계 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('approval.detail.approvalFlow')}</Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.25,
                border: `1px solid ${APPROVAL_FORM_BORDER.flowOuter}`,
                borderRadius: '14px',
                p: 1.5,
                bgcolor: 'background.paper',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
                mb: 2,
              }}>
                {approvalFlowLabels.map((label, flowIdx) => (
                  <Box key={label} sx={{
                    border: `1.5px dashed ${APPROVAL_FORM_BORDER.flowStep}`,
                    borderRadius: '12px',
                    minHeight: 62,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 0.5,
                    bgcolor: APPROVAL_FORM_BORDER.flowStepBg,
                  }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {flowIdx === 0
                        ? selectedDocument.requesterName
                        : getApprovalDisplayName(selectedDocument)}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {renderApprovalFlowTimeline(selectedDocument)}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                {resolveApprovalFlow(selectedDocument).map((step) => {
                  const statusLabel = (() => {
                    switch (step.status) {
                      case 'approved': return t('approval.detail.stepApproved');
                      case 'pending': return t('approval.detail.stepPending');
                      case 'rejected': return t('approval.detail.stepRejected');
                      case 'skipped': return t('approval.detail.stepSkipped');
                      default: return step.status;
                    }
                  })();
                  const statusColor = (() => {
                    switch (step.status) {
                      case 'approved': return 'success';
                      case 'pending': return 'warning';
                      case 'rejected': return 'error';
                      case 'skipped': return 'info';
                      default: return 'default';
                    }
                  })();
                  const approvedDate = step.approvedAt || '';
                  return (
                    <Card key={step.id} variant="outlined" sx={{ minWidth: 200, maxWidth: 240 }}>
                      <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" fontWeight={700}>{step.approverName}</Typography>
                          <Chip label={statusLabel} size="small" color={statusColor as any} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {step.approverPosition || '-'} / {step.approverDepartment || '-'}
                        </Typography>
                        {step.escalated && (
                          <Chip label={t('approval.detail.escalationChip')} size="small" color="info" />
                        )}
                        <Box
                          sx={{
                            mt: 0.5,
                            height: 110,
                            border: '1px dashed',
                            borderColor: step.signature ? 'divider' : 'grey.400',
                            borderRadius: 1,
                            bgcolor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1
                          }}
                        >
                          {step.signature ? (
                            <Box
                              component="img"
                              src={step.signature}
                              alt={t('approval.detail.signatureAlt')}
                              sx={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">{t('approval.detail.noSignature')}</Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('approval.detail.approvalDate')}: {approvedDate || '-'}
                        </Typography>
                        {step.comment && (
                          <Typography variant="caption" color="text.secondary">
                            {t('approval.detail.commentLabel')}: {step.comment}
                          </Typography>
                        )}
                        {step.status === 'pending' &&
                         step.approverId === user?.id &&
                         selectedDocument.status === 'in_review' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CreateIcon />}
                            onClick={() => handleOpenSignatureDialog(step.id)}
                            sx={{ mt: 0.5 }}
                          >
                            {t('approval.signatureDialogTitle')}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Box>

            {renderEscalationSection(selectedDocument)}

            {/* 댓글 섹션 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                댓글 ({selectedDocument.comments.length})
              </Typography>
              
              {/* 댓글 목록 */}
              {selectedDocument.comments.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2, p: 2, bgcolor: 'grey.50' }}>
                  <List>
                    {selectedDocument.comments
                      .filter(c => !c.parentId) // 부모 댓글만 먼저 표시
                      .map((comment) => (
                        <Box key={comment.id}>
                          <ListItem sx={{ alignItems: 'flex-start', px: 0 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {comment.userName.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {comment.userName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {comment.createdAt}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {comment.comment}
                                  </Typography>
                                  <Button
                                    size="small"
                                    startIcon={<ReplyIcon />}
                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    답글
                                  </Button>
                                  {/* 답글 입력 */}
                                  {replyingTo === comment.id && (
                                    <Box sx={{ mt: 1, ml: 2 }}>
                                      <TextField
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={2}
                                        placeholder={t('approval.detail.replyPlaceholder')}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        sx={{ mb: 1 }}
                                      />
                                      <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                          size="small"
                                          variant="contained"
                                          onClick={() => handleAddComment(selectedDocument.id, comment.id)}
                                        >
                                          등록
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() => {
                                            setReplyingTo(null);
                                            setReplyText('');
                                          }}
                                        >
                                          취소
                                        </Button>
                                      </Box>
                                    </Box>
                                  )}
                                  {/* 대댓글 표시 */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <Box sx={{ mt: 1, ml: 4 }}>
                                      {comment.replies.map((reply) => (
                                        <Box key={reply.id} sx={{ mb: 1, p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main', fontSize: '0.75rem' }}>
                                              {reply.userName.charAt(0)}
                                            </Avatar>
                                            <Typography variant="caption" fontWeight="bold">
                                              {reply.userName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {reply.createdAt}
                                            </Typography>
                                          </Box>
                                          <Typography variant="body2" sx={{ ml: 4 }}>
                                            {reply.comment}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          <Divider />
                        </Box>
                      ))}
                  </List>
                </Card>
              )}

              {/* 댓글 작성 */}
              <Card variant="outlined" sx={{ p: 2, bgcolor: 'white' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  댓글 작성
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder={t('approval.detail.commentPlaceholder')}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<CommentIcon />}
                    onClick={() => handleAddComment(selectedDocument.id)}
                    disabled={!newComment.trim()}
                  >
                    댓글 등록
                  </Button>
                </Box>
              </Card>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditDocument(selectedDocument)}
              >
                수정
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                인쇄
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                PDF 다운로드
              </Button>
              {(selectedDocument.status === 'submitted' || selectedDocument.status === 'in_review') && isCurrentApprover && (
                <>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      // 현재 승인 단계 확인
                      const currentStep = selectedDocument.approvalFlow.find(
                        step => step.approverId === user?.id && step.status === 'pending'
                      );
                      if (currentStep) {
                        handleOpenSignatureDialog(currentStep.id);
                      } else {
                        handleApproveDocument(selectedDocument.id);
                      }
                    }}
                  >
                    {t('approval.approve')}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectDocument(selectedDocument.id)}
                  >
                    {t('approval.reject')}
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* 서명 다이얼로그 */}
        <Dialog 
          open={signatureDialogOpen} 
          onClose={() => {
            setSignatureDialogOpen(false);
            setSigningStepId(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('approval.signatureDialogTitle')}</DialogTitle>
          <DialogContent>
            <SignaturePad
              onSave={handleSaveSignature}
              onCancel={() => {
                setSignatureDialogOpen(false);
                setSigningStepId(null);
              }}
              width={500}
              height={200}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setSignatureDialogOpen(false);
              setSigningStepId(null);
            }}>
              {t('approval.cancel')}
            </Button>
          </DialogActions>
        </Dialog>
        {renderAttachmentPreviewDialog()}
      </Box>
    );
  }

  const isListView = viewMode === 'list' && activeTab !== 2;

  return (
    <Box sx={{
      ...mvsPageRootSx,
      '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        backgroundColor: 'background.paper',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(theme.palette.divider, 0.9),
        },
        '&:hover': {
          bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.04),
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(theme.palette.text.primary, 0.12),
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: 'primary.main',
          borderWidth: 1,
        },
      },
      '& .MuiInputBase-input::placeholder': {
        color: '#9CA3AF',
        opacity: 1,
      },
    }}>
      <MvsPageHeader title={t('approval.pageTitle')} mb={2} />

      {/* 탭 네비게이션 */}
      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: isListView ? 3 : 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            if (newValue === 2) {
              if (viewMode !== 'create' && viewMode !== 'edit') {
                handleAdd();
              }
            } else {
              setViewMode('list');
              setSelectedDocument(null);
            }
          }}
          sx={{
            minHeight: 40,
            px: { xs: 1, sm: 1.5 },
            bgcolor: '#FFFFFF',
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              minHeight: 40,
              py: 0.75,
              letterSpacing: '-0.01em',
              color: 'text.secondary',
            },
            '& .MuiTab-root.Mui-selected': {
              color: 'primary.main',
              fontWeight: 700,
            },
            '& .MuiTab-root.Mui-disabled': {
              color: 'text.disabled',
            },
          }}
        >
          <Tab
            label={t('approval.received')}
            disabled={approvalMenuFlags.menusLoading || !approvalMenuFlags.canRead}
          />
          <Tab
            label={t('approval.myRequests')}
            disabled={approvalMenuFlags.menusLoading || !approvalMenuFlags.canRead}
          />
          <Tab
            label={t('approval.createDocument')}
            disabled={approvalMenuFlags.menusLoading || !approvalMenuFlags.canCreate}
          />
        </Tabs>
      </Card>

      {(viewMode === 'create' || viewMode === 'edit') && (
        <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3, maxWidth: '100%' }}>
          {/* 문서 헤더 */}
          <Box sx={{ 
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.1 : 0.045),
            color: 'text.primary', 
            p: { xs: 2, sm: 2.75 },
            borderBottom: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.85),
          }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: { xs: '1.75rem', sm: '2rem' }, lineHeight: 1.12, color: 'text.primary' }}
                >
                  {t('approval.formHeroTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {selectedDocument ? t('approval.editDocument') : t('approval.newDocument')}
                </Typography>
                {companyLogo && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    <AuthMedia
                      src={companyLogo}
                      alt={t('approval.companyLogoAlt')}
                      sx={{ maxHeight: 40, maxWidth: 180, objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ 
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  borderRadius: '14px',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 6px rgba(15, 23, 42, 0.04)',
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                    {t('approval.titleLabel')}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {selectedDocument?.documentId || draftDocumentId || t('approval.autoGenerated')}
                  </Typography>
                  <Box sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                      {t('approval.writtenDate')}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {selectedDocument?.createdAt || new Date().toLocaleDateString(dateLocale)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.25,
                  border: `1px solid ${APPROVAL_FORM_BORDER.flowOuter}`,
                  borderRadius: '14px',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06)',
                }}>
                  {approvalFlowLabels.map((label, flowIdx) => {
                    const selectedApprover = users.find(u => u.id === formData.nextApproverId);
                    const displayName = flowIdx === 0
                      ? user?.username
                      : selectedApprover?.username;
                    return (
                      <Box key={label} sx={{ 
                        border: `1.5px dashed ${APPROVAL_FORM_BORDER.flowStep}`,
                        borderRadius: '12px',
                        minHeight: 62,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 0.5,
                        bgcolor: APPROVAL_FORM_BORDER.flowStepBg,
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {label}
                        </Typography>
                        {displayName && (
                          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            {displayName}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 신청자 정보 섹션 */}
              {user && (
                <Box>
                  <Typography variant="subtitle2" sx={{ 
                    fontWeight: 700, 
                    fontSize: '15px',
                    mb: 1.5,
                    color: 'text.primary',
                    pb: 1,
                    borderBottom: '1px solid',
                    borderColor: APPROVAL_FORM_BORDER.section,
                    letterSpacing: '-0.01em',
                  }}>
                    {t('approval.applicantInfo')}
                  </Typography>
                  <Grid container spacing={2} sx={{ px: 0.5 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('approval.requester')}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user.username}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('approval.departmentRole')}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {(user as any).department || '-'} {(user as any).position ? `· ${(user as any).position}` : ''}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* 다음 결재 대상 */}
              <Box sx={{ 
                p: 2, 
                borderRadius: '14px', 
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06), 
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}>
                  <Typography variant="subtitle2" sx={{ 
                    fontWeight: 700,
                    fontSize: '15px',
                    mb: 1.5,
                    color: 'text.primary',
                    pb: 1,
                    borderBottom: '1px solid',
                    borderColor: APPROVAL_FORM_BORDER.section,
                    letterSpacing: '-0.01em',
                  }}>
                  {t('approval.approverSectionTitle')}
                </Typography>
                <Autocomplete
                    options={users.filter(u => u.id !== user?.id)}
                    getOptionLabel={(option) => `${option.username}${option.department ? ` (${option.department})` : ''}`}
                    value={users.find(u => u.id === formData.nextApproverId) || null}
                    onChange={(event, newValue) => {
                      setFormData({ ...formData, nextApproverId: newValue?.id || null });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label={t('approval.approverFieldLabel')}
                        {...APPROVAL_OUTLINED}
                        placeholder={t('approval.selectApprover')}
                        variant="outlined"
                        size="small"
                        inputRef={approverInputRef}
                        sx={{
                          ...approvalWriteFieldSx,
                          '& .MuiOutlinedInput-root': {
                            ...(approvalWriteFieldSx['& .MuiOutlinedInput-root'] as Record<string, unknown>),
                            borderRadius: '12px',
                            bgcolor: 'background.paper',
                          },
                        }}
                      />
                    )}
                  />
              </Box>

              <Divider />

              {/* 결재 내용 섹션 */}
                <Box>
                  <Typography variant="subtitle2" sx={{ 
                    fontWeight: 700,
                    fontSize: '15px',
                    mb: 2,
                    color: 'text.primary',
                    pb: 1,
                    borderBottom: '1px solid',
                    borderColor: APPROVAL_FORM_BORDER.section,
                    letterSpacing: '-0.01em',
                  }}>
                  {t('approval.paymentDetails')}
                </Typography>
                <Grid
                  container
                  spacing={2.5}
                  alignItems="flex-start"
                  sx={{
                    '& .MuiFormControl-root': { mt: 0 },
                    '& .MuiInputLabel-root': { lineHeight: 1.2 }
                  }}
                >
                  {/* 왼쪽 컬럼 */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label={t('approval.titleLabel')}
                        {...APPROVAL_OUTLINED}
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        variant="outlined"
                        inputRef={titleInputRef}
                        sx={approvalWriteFieldSx}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label={t('approval.category')}
                        {...APPROVAL_OUTLINED}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        variant="outlined"
                        sx={approvalWriteFieldSx}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label={t('approval.priority')}
                        {...APPROVAL_OUTLINED}
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        variant="outlined"
                        sx={approvalWriteFieldSx}
                      >
                        <MenuItem value="low">{t('approval.low')}</MenuItem>
                        <MenuItem value="medium">{t('approval.normal')}</MenuItem>
                        <MenuItem value="high">{t('approval.high')}</MenuItem>
                        <MenuItem value="urgent">{t('approval.urgent')}</MenuItem>
                      </TextField>
                    </Box>
                  </Grid>

                  {/* 오른쪽 컬럼 */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        select
                        label={t('approval.type')}
                        {...APPROVAL_OUTLINED}
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        required
                        variant="outlined"
                        sx={approvalWriteFieldSx}
                      >
                        <MenuItem value="expense">{t('approval.expense')}</MenuItem>
                        <MenuItem value="purchase">{t('approval.purchase')}</MenuItem>
                        <MenuItem value="contract">{t('approval.contract')}</MenuItem>
                        <MenuItem value="other">{t('approval.other')}</MenuItem>
                      </TextField>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={t('approval.amount')}
                        {...APPROVAL_OUTLINED}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        variant="outlined"
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>Rs.</Typography>
                        }}
                        sx={approvalWriteFieldSx}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label={t('approval.deadline')}
                        {...APPROVAL_OUTLINED}
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        variant="outlined"
                        sx={approvalWriteFieldSx}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {/* 설명 섹션 - 전체 너비 */}
                <Box
                  sx={{
                    mt: 3.5,
                    border: `1px solid ${APPROVAL_FORM_BORDER.section}`,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 280,
                  }}
                >
                          {/* 서식 툴바 */}
                          {editor && (
                            <Box sx={{
                              borderBottom: `1px solid ${APPROVAL_FORM_BORDER.section}`,
                              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.05),
                              p: 1.25,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.75,
                            }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', px: 0.25 }}>
                                {t('approval.toolbar.label')}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65, alignItems: 'center' }}>
                              <Tooltip title={t('approval.toolbar.undo')}>
                                <span>
                                  <Button
                                    size="small"
                                    variant="text"
                                    disableElevation
                                    disabled={!editor.can().undo()}
                                    onClick={() => editor.chain().focus().undo().run()}
                                    sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px' }}
                                  >
                                    <UndoIcon fontSize="small" />
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title={t('approval.toolbar.redo')}>
                                <span>
                                  <Button
                                    size="small"
                                    variant="text"
                                    disableElevation
                                    disabled={!editor.can().redo()}
                                    onClick={() => editor.chain().focus().redo().run()}
                                    sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px' }}
                                  >
                                    <RedoIcon fontSize="small" />
                                  </Button>
                                </span>
                              </Tooltip>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <Button
                                size="small"
                                variant={editor.isActive('bold') ? 'contained' : 'text'}
                                disableElevation
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                <strong>B</strong>
                              </Button>
                              <Button
                                size="small"
                                variant={editor.isActive('italic') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                <em>I</em>
                              </Button>
                              <Button
                                size="small"
                                variant={editor.isActive('underline') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                <u>U</u>
                              </Button>
                              <Button
                                size="small"
                                variant={editor.isActive('strike') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                <s>S</s>
                              </Button>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <FormControl size="small" sx={{ minWidth: 100 }}>
                                <Select
                                  value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === 'p') {
                                      editor.chain().focus().setParagraph().run();
                                    } else {
                                      editor.chain().focus().toggleHeading({ level: parseInt(value.replace('h', '')) as 1 | 2 | 3 }).run();
                                    }
                                  }}
                                  sx={{
                                    height: 32,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.field },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.fieldHover },
                                  }}
                                >
                                  <MenuItem value="p">{t('approval.toolbar.body')}</MenuItem>
                                  <MenuItem value="h1">{t('approval.toolbar.heading1')}</MenuItem>
                                  <MenuItem value="h2">{t('approval.toolbar.heading2')}</MenuItem>
                                  <MenuItem value="h3">{t('approval.toolbar.heading3')}</MenuItem>
                                </Select>
                              </FormControl>
                              <FormControl size="small" sx={{ minWidth: 80 }}>
                                <Select
                                  value={fontSize}
                                  onChange={(e) => {
                                    // CSS 스타일로 fontSize 설정
                                    const value = e.target.value as string;
                                    setFontSize(value);
                                    editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
                                  }}
                                  sx={{
                                    height: 32,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.field },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.fieldHover },
                                  }}
                                >
                                  <MenuItem value="12px">12px</MenuItem>
                                  <MenuItem value="14px">14px</MenuItem>
                                  <MenuItem value="16px">16px</MenuItem>
                                  <MenuItem value="18px">18px</MenuItem>
                                  <MenuItem value="24px">24px</MenuItem>
                                </Select>
                              </FormControl>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={fontFamily}
                                  displayEmpty
                                  onChange={(e) => {
                                    const value = e.target.value as string;
                                    setFontFamily(value);
                                    if (value) {
                                      editor.chain().focus().setFontFamily(value).run();
                                    } else {
                                      editor.chain().focus().unsetFontFamily().run();
                                    }
                                  }}
                                  sx={{
                                    height: 32,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.field },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: APPROVAL_FORM_BORDER.fieldHover },
                                  }}
                                >
                                  <MenuItem value="">{t('approval.toolbar.fontDefault')}</MenuItem>
                                  <MenuItem value="Arial">Arial</MenuItem>
                                  <MenuItem value="Georgia">Georgia</MenuItem>
                                  <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                                  <MenuItem value="Verdana">Verdana</MenuItem>
                                  <MenuItem value="Courier New">Courier New</MenuItem>
                                </Select>
                              </FormControl>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
                                <Box
                                  component="input"
                                  type="color"
                                  value={fontColor}
                                  onMouseDown={(e: React.MouseEvent<HTMLInputElement>) => {
                                    e.preventDefault();
                                  }}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value;
                                    setFontColor(value);
                                    if (lastSelectionRef.current) {
                                      editor.view.dispatch(editor.state.tr.setSelection(lastSelectionRef.current));
                                    }
                                    editor.chain().focus().setColor(value).run();
                                  }}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    border: '1px solid',
                                    borderColor: 'grey.300',
                                    borderRadius: 1,
                                    padding: 0,
                                    background: 'transparent',
                                    cursor: 'pointer'
                                  }}
                                />
                                <Box
                                  component="input"
                                  type="color"
                                  value={backgroundColor}
                                  onMouseDown={(e: React.MouseEvent<HTMLInputElement>) => {
                                    e.preventDefault();
                                  }}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value;
                                    setBackgroundColor(value);
                                    if (lastSelectionRef.current) {
                                      editor.view.dispatch(editor.state.tr.setSelection(lastSelectionRef.current));
                                    }
                                    editor.chain().focus().setMark('textStyle', { backgroundColor: value }).run();
                                  }}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    border: '1px solid',
                                    borderColor: 'grey.300',
                                    borderRadius: 1,
                                    padding: 0,
                                    background: 'transparent',
                                    cursor: 'pointer'
                                  }}
                                />
                              </Box>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <Button
                                size="small"
                                variant={editor.isActive('bulletList') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.list')}
                              </Button>
                              <Button
                                size="small"
                                variant={editor.isActive('orderedList') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.numberedList')}
                              </Button>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <Tooltip title={t('approval.toolbar.alignLeft')}>
                                <Button
                                  size="small"
                                  variant={editor.isActive({ textAlign: 'left' }) ? 'contained' : 'text'}
                                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                  sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                                >
                                  <FormatAlignLeftIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                              <Tooltip title={t('approval.toolbar.alignCenter')}>
                                <Button
                                  size="small"
                                  variant={editor.isActive({ textAlign: 'center' }) ? 'contained' : 'text'}
                                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                  sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                                >
                                  <FormatAlignCenterIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                              <Tooltip title={t('approval.toolbar.alignRight')}>
                                <Button
                                  size="small"
                                  variant={editor.isActive({ textAlign: 'right' }) ? 'contained' : 'text'}
                                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                  sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                                >
                                  <FormatAlignRightIcon fontSize="small" />
                                </Button>
                              </Tooltip>
                              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                              <Button
                                size="small"
                                variant={editor.isActive('blockquote') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.quote')}
                              </Button>
                              <Button
                                size="small"
                                variant={editor.isActive('codeBlock') ? 'contained' : 'text'}
                                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {'</>'}
                              </Button>
                              <Button
                                size="small"
                                onClick={() => {
                                  showPrompt(
                                    t('approval.linkPrompt', { defaultValue: '링크 URL을 입력하세요.' }),
                                    (url) => {
                                      const normalizedUrl = url.trim();
                                      if (!normalizedUrl) return;
                                      const safeUrl = normalizedUrl.replace(/"/g, '&quot;');
                                      editor
                                        ?.chain()
                                        .focus()
                                        .insertContent(
                                          `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`
                                        )
                                        .run();
                                    },
                                    {
                                      title: t('approval.toolbar.link'),
                                      defaultValue: 'https://',
                                      required: false,
                                      confirmText: t('common.confirm'),
                                      cancelText: t('common.cancel')
                                    }
                                  );
                                }}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.link')}
                              </Button>
                              <Button
                                size="small"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.setAttribute('type', 'file');
                                  input.setAttribute('accept', 'image/*');
                                  input.click();
                                  input.onchange = () => {
                                    const file = input.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (e) => {
                                        const result = e.target?.result as string;
                                        if (result) {
                                          // 이미지 삽입 (간단한 방법)
                                          editor.chain()
                                            .focus()
                                            .setImage({ src: result })
                                            .run();
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  };
                                }}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.image')}
                              </Button>
                              <Button
                                size="small"
                                onClick={() => setTableDialogOpen(true)}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.table')}
                              </Button>
                              <Button
                                size="small"
                                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                                sx={{ minWidth: 'auto', px: 1.1, borderRadius: '10px', textTransform: 'none' }}
                              >
                                {t('approval.toolbar.clear')}
                              </Button>
                              </Box>
                            </Box>
                          )}
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      '& > div': {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0,
                      },
                      '& .tiptap': {
                        flex: 1,
                        minHeight: 230,
                        p: 2.25,
                        outline: 'none',
                        fontSize: '0.875rem',
                        bgcolor: 'background.paper',
                        border: 'none',
                        '& p.is-editor-empty:first-child::before': {
                          content: `"${t('approval.enterDescription')}"`,
                          color: 'rgba(0, 0, 0, 0.38)',
                          float: 'left',
                          height: 0,
                          pointerEvents: 'none'
                        },
                        '& img': {
                          maxWidth: '100%',
                          height: 'auto',
                          display: 'block !important',
                          border: '2px dashed transparent',
                          borderRadius: 1,
                          transition: 'all 0.2s',
                          margin: '12px auto',
                          clear: 'both',
                          '&:hover': {
                            borderColor: 'primary.main',
                            opacity: 0.9,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }
                        },
                        '& p:has(img)': {
                          margin: '12px 0 !important',
                          textAlign: 'center',
                          display: 'block !important',
                          clear: 'both',
                          '& img': {
                            display: 'block !important',
                            margin: '12px auto !important',
                            clear: 'both'
                          }
                        },
                        '& p > img': {
                          display: 'block !important',
                          margin: '12px auto !important',
                          clear: 'both'
                        },
                        '& img.editor-image-active': {
                          borderColor: 'primary.main',
                          boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.15)'
                        },
                        '& .editor-image-resize-handle': {
                          position: 'absolute',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          border: '2px solid #fff',
                          boxShadow: '0 1px 6px rgba(0,0,0,0.3)',
                          cursor: 'nwse-resize',
                          zIndex: 1200,
                          display: 'none'
                        },
                        '& table': {
                          borderCollapse: 'collapse',
                          width: '100%',
                          margin: '16px 0',
                          position: 'relative',
                          '& td, & th': {
                            border: '1px solid #ddd',
                            padding: '8px',
                            textAlign: 'left',
                            position: 'relative'
                          },
                          '& th': {
                            backgroundColor: '#f2f2f2',
                            fontWeight: 'bold'
                          },
                          '& tr': {
                            position: 'relative'
                          },
                          '& .table-col-resize-handle': {
                            position: 'absolute',
                            top: 0,
                            right: '-5px',
                            width: '10px',
                            height: '100%',
                            cursor: 'col-resize',
                            zIndex: 1000,
                            background: 'transparent',
                            transition: 'background 0.2s',
                            '&:hover': {
                              background: 'rgba(25, 118, 210, 0.3)'
                            }
                          },
                          '& .table-row-resize-handle': {
                            position: 'absolute',
                            bottom: '-5px',
                            left: 0,
                            width: '100%',
                            height: '10px',
                            cursor: 'row-resize',
                            zIndex: 1000,
                            background: 'transparent',
                            transition: 'background 0.2s',
                            '&:hover': {
                              background: 'rgba(25, 118, 210, 0.3)'
                            }
                          }
                        },
                      },
                    }}>
                      {editor ? <EditorContent editor={editor} /> : null}
                    </Box>

                    {/* 표 생성 다이얼로그 */}
                    <Dialog 
                      open={tableDialogOpen} 
                      onClose={() => setTableDialogOpen(false)}
                      maxWidth="sm"
                      fullWidth
                    >
                      <DialogTitle>{t('approval.tableDialog.title')}</DialogTitle>
                      <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                          <TextField
                            label={t('approval.tableDialog.rows')}
                            type="number"
                            value={tableRows}
                            onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                            inputProps={{ min: 1, max: 20 }}
                            fullWidth
                            size="small"
                          />
                          <TextField
                            label={t('approval.tableDialog.cols')}
                            type="number"
                            value={tableCols}
                            onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                            inputProps={{ min: 1, max: 20 }}
                            fullWidth
                            size="small"
                          />
                          <FormControl fullWidth size="small">
                            <InputLabel>{t('approval.tableDialog.headerRow')}</InputLabel>
                            <Select
                              value={tableHasHeader ? 'yes' : 'no'}
                              onChange={(e) => setTableHasHeader(e.target.value === 'yes')}
                              label={t('approval.tableDialog.headerRow')}
                            >
                              <MenuItem value="yes">{t('approval.tableDialog.yes')}</MenuItem>
                              <MenuItem value="no">{t('approval.tableDialog.no')}</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </DialogContent>
                      <DialogActions>
                        <Button onClick={() => setTableDialogOpen(false)}>
                          {t('approval.cancel')}
                        </Button>
                        <Button 
                          variant="contained"
                          onClick={() => {
                            if (editor) {
                              editor.chain()
                                .focus()
                                .insertTable({ 
                                  rows: tableRows, 
                                  cols: tableCols, 
                                  withHeaderRow: tableHasHeader 
                                })
                                .run();
                              setTableDialogOpen(false);
                            }
                          }}
                        >
                          {t('approval.tableDialog.create')}
                        </Button>
                      </DialogActions>
                    </Dialog>
                </Box>
              </Box>

              <Divider />

              {/* 파일 첨부 섹션 */}
              <Box>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 700,
                  fontSize: '15px',
                  mb: 2,
                  color: 'text.primary',
                  pb: 1,
                  borderBottom: '1px solid',
                  borderColor: APPROVAL_FORM_BORDER.section,
                  letterSpacing: '-0.01em',
                }}>
                  {t('approval.attachments')}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <input
                    type="file"
                    ref={(input) => setFileInputRef(input)}
                    onChange={handleFileSelect}
                    multiple
                    style={{ display: 'none' }}
                    id="file-upload-input"
                  />
                  <label htmlFor="file-upload-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFileIcon />}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderStyle: 'dashed',
                        borderColor: APPROVAL_FORM_BORDER.field,
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: APPROVAL_FORM_BORDER.fieldHover,
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                          color: 'primary.main',
                        },
                      }}
                    >
                      {t('approval.selectFiles')}
                    </Button>
                  </label>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {t('approval.multipleFilesHint')}
                  </Typography>
                </Box>
                {existingAttachments.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {existingAttachments.map((file, index) => {
                      const label = getAttachmentLabel(file);
                      const isImage = isImageAttachment(file);
                      return (
                        <Box
                          key={`${label}-${index}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.5,
                            mb: 1,
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.05),
                            border: `1px solid ${APPROVAL_FORM_BORDER.section}`,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.08),
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <AttachFileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            <Typography
                              variant="body2"
                              sx={{
                                flex: 1,
                                cursor: 'pointer',
                                color: isImage ? 'primary.main' : 'inherit',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                              onClick={() => handleOpenAttachment(file)}
                            >
                              {label}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isImage ? (
                              <IconButton
                                size="small"
                                aria-label={t('approval.detail.imagePreview')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewAttachment(file);
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            ) : null}
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadAttachment(file);
                              }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExistingFileRemove(index);
                              }}
                              sx={{
                                color: 'error.main',
                                '&:hover': {
                                  bgcolor: 'error.50'
                                }
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                {attachedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {attachedFiles.map((file, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.5,
                          mb: 1,
                          borderRadius: '12px',
                          border: `1px solid ${APPROVAL_FORM_BORDER.section}`,
                          bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.04),
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <AttachFileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024).toFixed(2)} KB
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleFileRemove(index)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              bgcolor: 'error.50'
                            }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <Divider />

              {/* 버튼 */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 1.5,
                pt: 2.5,
                flexWrap: 'wrap',
              }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setViewMode('list');
                    setActiveTab(1);
                    setSelectedDocument(null);
                  }}
                  disabled={saving}
                  sx={mvsBodyOutlinedBtnSx}
                >
                  {t('approval.cancel')}
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {saving ? t('approval.saving') : (selectedDocument ? t('approval.update') : t('approval.create'))}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 - 목록 모드일 때만 표시 */}
      {isListView && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          {(
            [
              { label: t('approval.statistics.pending'), value: pendingCount, color: 'warning.dark' as const },
              { label: t('approval.statistics.approved'), value: approvedCount, color: 'success.dark' as const },
              { label: t('approval.statistics.rejected'), value: rejectedCount, color: 'error.dark' as const },
              { label: t('approval.statistics.totalAmount'), value: totalAmount.toLocaleString(), color: 'text.primary' as const },
            ] as const
          ).map((stat) => (
            <Card key={stat.label} elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, display: 'block', mb: 0.75, letterSpacing: '0.02em' }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: stat.color, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* 필터 및 검색 - 목록 모드일 때만 표시 */}
      {isListView && (
        <Card elevation={0} sx={mvsBodyCardSx}>
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              bgcolor: '#FFFFFF',
              ...approvalFilterFieldSx,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 1fr' },
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              size="small"
              label={t('common.search')}
              placeholder={t('approval.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#6B7280', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={approvalFilterFieldSx}
            />
            <TextField
              fullWidth
              size="small"
              select
              label={t('approval.status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={approvalFilterFieldSx}
            >
              <MenuItem value="">{t('approval.all')}</MenuItem>
              <MenuItem value="draft">{t('approval.draft')}</MenuItem>
              <MenuItem value="submitted">{t('approval.submitted')}</MenuItem>
              <MenuItem value="in_review">{t('approval.inReview')}</MenuItem>
              <MenuItem value="approved">{t('approval.approved')}</MenuItem>
              <MenuItem value="rejected">{t('approval.rejected')}</MenuItem>
              <MenuItem value="cancelled">{t('approval.cancelled')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('approval.type')}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={approvalFilterFieldSx}
            >
              <MenuItem value="">{t('approval.all')}</MenuItem>
              <MenuItem value="expense">{t('approval.expense')}</MenuItem>
              <MenuItem value="purchase">{t('approval.purchase')}</MenuItem>
              <MenuItem value="contract">{t('approval.contract')}</MenuItem>
              <MenuItem value="other">{t('approval.other')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('approval.priority')}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={approvalFilterFieldSx}
            >
              <MenuItem value="">{t('approval.all')}</MenuItem>
              <MenuItem value="low">{t('approval.low')}</MenuItem>
              <MenuItem value="medium">{t('approval.normal')}</MenuItem>
              <MenuItem value="high">{t('approval.high')}</MenuItem>
              <MenuItem value="urgent">{t('approval.urgent')}</MenuItem>
            </TextField>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
                setPriorityFilter('');
              }}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
            >
              {t('approval.reset')}
            </Button>
          </Box>
        </Card>
      )}

      {/* 결재 문서 목록 테이블 - 목록 모드일 때만 표시 */}
      {isListView && (
        <Box sx={mvsBodyListZoneSx}>
          <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
            <Table
              size="small"
              sx={{
                borderCollapse: 'collapse',
                bgcolor: 'transparent',
                '& .MuiTableCell-root': {
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                },
              }}
            >
            <TableHead sx={mvsTableHeadHighlightSx}>
              <TableRow>
                <TableCell
                  align="center"
                  sx={{
                    width: 58,
                    minWidth: 58,
                    maxWidth: 58,
                    whiteSpace: 'nowrap'
                  }}
                >
                  No.
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'title'}
                    direction={orderBy === 'title' ? order : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    {t('approval.documentNumber')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'requesterName'}
                    direction={orderBy === 'requesterName' ? order : 'asc'}
                    onClick={() => handleSort('requesterName')}
                  >
                    {t('approval.requester')}
                  </TableSortLabel>
                </TableCell>
                {activeTab === 1 && (
                  <TableCell>{t('approval.flowColumn')}</TableCell>
                )}
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'type'}
                    direction={orderBy === 'type' ? order : 'asc'}
                    onClick={() => handleSort('type')}
                  >
                    {t('approval.type')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    {t('approval.status')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'priority'}
                    direction={orderBy === 'priority' ? order : 'asc'}
                    onClick={() => handleSort('priority')}
                  >
                    {t('approval.priority')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? order : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    {t('approval.requestDate')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>{t('approval.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={mvsTableBodyRowSx}>
              {paginatedDocuments.map((document, index) => (
                <TableRow
                  key={document.id}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleViewDocument(document)}
                >
                  <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {(page - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {document.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          mr: 1,
                          width: 30,
                          height: 30,
                          bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                          color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.55)' : theme.palette.grey[300],
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {document.requesterName}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  {activeTab === 1 && (
                    <TableCell>
                      <Typography variant="caption" component="span" color="text.secondary">
                        {document.requesterName}
                      </Typography>
                      <Typography variant="caption" component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
                        →
                      </Typography>
                      <Typography variant="caption" component="span" sx={{ fontWeight: 600 }}>
                        {getApprovalDisplayName(document)}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    {getTypeChip(document.type)}
                  </TableCell>
                  <TableCell>{getStatusChip(document.status)}</TableCell>
                  <TableCell>{getPriorityChip(document.priority)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{formatDateTime(document.createdAt)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {activeTab === 0 &&
                        document.currentApproverId === user?.id &&
                        (document.status === 'submitted' || document.status === 'in_review') && (
                        <>
                          <Tooltip title={t('approval.approve')}>
                            <IconButton 
                              size="small" 
                              onClick={(event) => {
                                event.stopPropagation();
                                handleApproveDocument(document.id);
                              }}
                              color="error"
                              sx={{ p: 0.6 }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('approval.reject')}>
                            <IconButton 
                              size="small" 
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRejectDocument(document.id);
                              }}
                              color="primary"
                              sx={{ p: 0.6 }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('approval.escalate')}>
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleViewDocument(document);
                              }}
                              color="info"
                              sx={{ p: 0.6 }}
                            >
                              <ReplyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={t('approval.delete')}>
                        <IconButton 
                          size="small" 
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteDocument(document.id);
                          }}
                          sx={{
                            p: 0.6,
                            color: 'text.secondary',
                            borderRadius: '10px',
                            '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={mvsBodyPaginationSx}>
          <Pagination
            count={Math.ceil(filteredDocuments.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            shape="rounded"
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
        </Box>
      )}

      {/* 상세 보기 다이얼로그 */}
      <Dialog
        open={detailDialogOpen && !!selectedDocument}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('approval.detailPageTitle')}
          <IconButton onClick={() => setDetailDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDocument && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {t('approval.detail.approvalFlow')}
                </Typography>
                {renderApprovalFlowSummary(selectedDocument)}
                {renderApprovalFlowTimeline(selectedDocument)}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">문서번호</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{selectedDocument.documentId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">신청일</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{formatDateTime(selectedDocument.createdAt)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">신청자</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{selectedDocument.requesterName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">부서/직책</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {selectedDocument.requesterDepartment} {selectedDocument.requesterPosition}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">유형</Typography>
                  <Box sx={{ mt: 0.5 }}>
                  {getTypeChip(selectedDocument.type)}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">상태</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusChip(selectedDocument.status)}
                  </Box>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">제목</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{selectedDocument.title}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">설명</Typography>
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    '& img': {
                      maxWidth: '100%',
                      height: 'auto'
                    },
                    '& table': {
                      width: '100%',
                      borderCollapse: 'collapse'
                    },
                    '& td, & th': {
                      border: '1px solid #ddd',
                      padding: '6px'
                    }
                  }}
                  dangerouslySetInnerHTML={{
                    __html: normalizeEditorHtml(selectedDocument.description || '<p>-</p>')
                  }}
                />
              </Box>
              {(() => {
                const attachmentList: any[] = Array.isArray(selectedDocument.attachments)
                  ? selectedDocument.attachments
                  : parseJsonArray(selectedDocument.attachments as any);
                return attachmentList.length > 0 ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">첨부파일</Typography>
                  <List dense>
                    {attachmentList.map((file: any, index: number) => {
                      const label = getAttachmentLabel(file);
                      const isImage = isImageAttachment(file);
                      return (
                        <ListItem key={`${label}-${index}`}>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                sx={{
                                  cursor: 'pointer',
                                  color: isImage ? 'primary.main' : 'inherit',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                                onClick={() => handleOpenAttachment(file)}
                              >
                                {label}
                              </Typography>
                            }
                          />
                          {isImage ? (
                            <IconButton
                              size="small"
                              aria-label={t('approval.detail.imagePreview')}
                              onClick={() => handlePreviewAttachment(file)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                          <IconButton size="small" onClick={() => handleDownloadAttachment(file)}>
                            <DownloadIcon />
                          </IconButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
                ) : null;
              })()}
              {renderEscalationSection(selectedDocument)}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button
            onClick={() => {
              setDetailDialogOpen(false);
              setEscalateTo(null);
              setEscalationComment('');
            }}
            variant="outlined"
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
          >
            {t('common.close')}
          </Button>
          {selectedDocument &&
            selectedDocument.currentApproverId === user?.id &&
            (selectedDocument.status === 'submitted' || selectedDocument.status === 'in_review') && (
              <>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleApproveDocument(selectedDocument.id)}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('approval.approve')}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CancelIcon />}
                  onClick={() => handleRejectDocument(selectedDocument.id)}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('approval.reject')}
                </Button>
              </>
            )}
          {selectedDocument && selectedDocument.requesterId === user?.id && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setDetailDialogOpen(false);
                handleEditDocument(selectedDocument);
              }}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
            >
              {t('approval.update')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialogState.open}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        confirmColor={confirmDialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <PromptDialog
        open={promptDialogState.open}
        title={promptDialogState.title}
        titleKey={promptDialogState.titleKey}
        message={promptDialogState.message}
        messageKey={promptDialogState.messageKey}
        label={promptDialogState.label}
        labelKey={promptDialogState.labelKey}
        defaultValue={promptDialogState.defaultValue}
        placeholder={promptDialogState.placeholder}
        placeholderKey={promptDialogState.placeholderKey}
        multiline={promptDialogState.multiline}
        minRows={promptDialogState.minRows}
        confirmText={promptDialogState.confirmText}
        confirmTextKey={promptDialogState.confirmTextKey}
        cancelText={promptDialogState.cancelText}
        cancelTextKey={promptDialogState.cancelTextKey}
        required={promptDialogState.required}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />

      {/* 첨부 이미지 미리보기 */}
      {renderAttachmentPreviewDialog()}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ElectronicApproval;
