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
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  FormatAlignLeft as FormatAlignLeftIcon,
  FormatAlignCenter as FormatAlignCenterIcon,
  FormatAlignRight as FormatAlignRightIcon,
  Reply as ReplyIcon,
  Create as CreateIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { approvalService, api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import SignaturePad from '../../components/Common/SignaturePad';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
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
import PromptDialog from '../../components/Common/PromptDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePromptDialog } from '../../hooks/usePromptDialog';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';
import { mvsPageTitleSx } from '../../theme/mvsLayout';

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

const ElectronicApproval: React.FC = () => {
  const theme = useTheme();
  const { user } = useStore();
  const approvalMenuFlags = useMenuRoutePermissionFlags(WORK_APPROVAL_MENU_ROUTES);
  const { t, i18n } = useTranslation();
  const approvalFlowLabels = useMemo(
    () => [t('approval.flowDraft'), t('approval.flowReview'), t('approval.flowApprove')],
    [t]
  );
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';
  const [documents, setDocuments] = useState<ApprovalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<ApprovalDocument[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<ApprovalDocument | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view' | 'received'>('list');
  const [activeTab, setActiveTab] = useState(0); // 0: 내가 요청한 결제, 1: 받은 결제, 2: 결제 문서 작성
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
  const [fontColor, setFontColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [companyLogo, setCompanyLogo] = useState('');
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

  // 샘플 데이터 (폴백용)
  const sampleData = useMemo<ApprovalDocument[]>(() => [
    {
      id: 1,
      documentId: 'APP-2024-001',
      title: '개발팀 장비 구매 신청',
      type: 'purchase',
      category: 'IT 장비',
      amount: 5000000,
      requesterId: 1001,
      requesterName: '김개발',
      requesterDepartment: '개발팀',
      requesterPosition: '개발팀장',
      description: '개발팀 업무 효율성 향상을 위한 고성능 개발 장비 구매 신청',
      attachments: ['견적서.pdf', '제품사양서.pdf'],
      status: 'in_review',
      priority: 'high',
      currentApproverId: 2001,
      currentApproverName: '이부장',
      approvalFlow: [
        {
          id: 1,
          stepOrder: 1,
          approverId: 2001,
          approverName: '이부장',
          approverDepartment: 'IT부',
          approverPosition: '부장',
          status: 'approved',
          approvedAt: '2024-01-15 10:30:00',
          comment: '필요성 인정, 다음 단계로 진행'
        },
        {
          id: 2,
          stepOrder: 2,
          approverId: 3001,
          approverName: '박이사',
          approverDepartment: '경영진',
          approverPosition: '이사',
          status: 'pending'
        }
      ],
      createdAt: '2024-01-15 09:00:00',
      updatedAt: '2024-01-15 10:30:00',
      dueDate: '2024-01-20',
      comments: [
        {
          id: 1,
          userId: 2001,
          userName: '이부장',
          comment: '예산 범위 내에서 진행 가능합니다.',
          createdAt: '2024-01-15 10:30:00',
          isInternal: false
        }
      ]
    },
    {
      id: 2,
      documentId: 'APP-2024-002',
      title: '연차 사용 신청',
      type: 'vacation',
      category: '휴가',
      requesterId: 1002,
      requesterName: '이프론트',
      requesterDepartment: '개발팀',
      requesterPosition: '프론트엔드 개발자',
      description: '개인 사정으로 인한 연차 사용 신청 (2024-01-25 ~ 2024-01-26)',
      attachments: [],
      status: 'approved',
      priority: 'medium',
      approvalFlow: [
        {
          id: 3,
          stepOrder: 1,
          approverId: 1001,
          approverName: '김개발',
          approverDepartment: '개발팀',
          approverPosition: '개발팀장',
          status: 'approved',
          approvedAt: '2024-01-20 14:00:00',
          comment: '승인합니다. 즐거운 휴가 되세요.'
        }
      ],
      createdAt: '2024-01-20 13:30:00',
      updatedAt: '2024-01-20 14:00:00',
      dueDate: '2024-01-22',
      comments: []
    },
    {
      id: 3,
      documentId: 'APP-2024-003',
      title: '교육비 지출 신청',
      type: 'expense',
      category: '교육비',
      amount: 300000,
      requesterId: 1003,
      requesterName: '박백엔드',
      requesterDepartment: '개발팀',
      requesterPosition: '백엔드 개발자',
      description: 'AWS 클라우드 아키텍처 교육 과정 수강료 지출 신청',
      attachments: ['교육과정안내.pdf', '수강신청서.pdf'],
      status: 'submitted',
      priority: 'medium',
      currentApproverId: 1001,
      currentApproverName: '김개발',
      approvalFlow: [
        {
          id: 4,
          stepOrder: 1,
          approverId: 1001,
          approverName: '김개발',
          approverDepartment: '개발팀',
          approverPosition: '개발팀장',
          status: 'pending'
        }
      ],
      createdAt: '2024-01-22 11:00:00',
      updatedAt: '2024-01-22 11:00:00',
      dueDate: '2024-01-25',
      comments: []
    }
  ], []);

  const loadApprovalData = useCallback(async () => {
    setError('');
    try {
      const response = await approvalService.getApprovals();
      if (response.success) {
        const documentsData: ApprovalDocument[] = (response.data || []).map((d: any) => ({
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
          description: normalizeEditorHtml(d.description || ''),
          attachments: parseJsonArray(d.attachments),
          status: d.status || 'draft',
          priority: d.priority || 'medium',
          currentApproverId: d.current_approver_id,
          currentApproverName: d.currentApprover?.username,
          approvalFlow: parseJsonArray(d.approval_flow),
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || new Date().toISOString(),
          dueDate: d.due_date,
          comments: parseJsonArray(d.comments)
        }));
        setDocuments(documentsData.length > 0 ? documentsData : sampleData);
      } else {
        setError(response.message || t('approval.errors.loadList'));
        setDocuments(sampleData);
      }
    } catch (error: any) {
      console.error('전자 결제 목록 조회 오류:', error);
      setError(error.response?.data?.message || t('approval.errors.loadListFailed'));
      setDocuments(sampleData);
    }
  }, [normalizeEditorHtml, parseJsonArray, sampleData, t]);

  useEffect(() => {
    if (!editor) return;
    const updateToolbarState = () => {
      const textStyleAttrs = editor.getAttributes('textStyle') || {};
      setFontSize(textStyleAttrs.fontSize || '14px');
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
      const response = await api.get('/users', {
        params: {
          status: 'active',
          company_id: user?.company_id
        }
      });
      if (response.data.success) {
        const allUsers = response.data.data || [];
        // 같은 회사 직원만 필터링하고 자신을 제외
        const filteredUsers = allUsers.filter((u: any) => 
          u.company_id === user?.company_id && u.id !== user?.id
        );
        setUsers(filteredUsers);
      }
    } catch (error: any) {
      console.error('사용자 목록 조회 오류:', error);
    }
  }, [user?.company_id, user?.id]);


  const filterDocuments = useCallback(() => {
    let filtered = documents;

    // 탭에 따라 필터링
    if (activeTab === 0) {
      // 내가 요청한 결제
      filtered = filtered.filter(doc => doc.requesterId === user?.id);
    } else if (activeTab === 1) {
      // 받은 결제 (승인 대기 중인 결제)
      filtered = filtered.filter(doc => 
        doc.currentApproverId === user?.id && 
        (doc.status === 'submitted' || doc.status === 'in_review')
      );
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
  }, [documents, searchTerm, statusFilter, typeFilter, priorityFilter, activeTab, user?.id, orderBy, order]);

  useEffect(() => {
    loadApprovalData();
    loadUsers();
  }, [loadApprovalData, loadUsers]);

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        if (user?.company_id) {
          const response = await api.get(`/company/${user.company_id}`);
          if (response.data.success) {
            setCompanyLogo(response.data.data?.company_logo || '');
            return;
          }
        }

        const response = await api.get('/company');
        if (response.data.success) {
          const companies = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          setCompanyLogo(companies[0]?.company_logo || '');
        }
      } catch (error) {
        console.error('회사 로고 로드 오류:', error);
        setCompanyLogo('');
      }
    };

    if (user) {
      fetchCompanyLogo();
    }
  }, [user]);

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
          height: 26,
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.6875rem',
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

  const getAttachmentUrl = (file: string | { name?: string; storedName?: string }) => {
    const fileName = typeof file === 'string' ? file : (file.storedName || file.name || '');
    if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
      return fileName;
    }
    const apiBase = api.defaults.baseURL || '';
    const apiRoot = apiBase.replace(/\/api\/?$/, '');
    return `${apiRoot}/uploads/${encodeURIComponent(fileName)}`;
  };

  const handleDownloadAttachment = (file: string | { name?: string; storedName?: string }) => {
    const url = getAttachmentUrl(file);
    const downloadName = typeof file === 'string' ? file : (file.name || file.storedName || 'attachment');
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const handleViewDocument = (document: ApprovalDocument) => {
    setSelectedDocument(document);
    setDetailDialogOpen(true);
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
      }

      if (response.success) {
        setSuccess(selectedDocument ? t('approval.toast.documentUpdated') : t('approval.toast.documentCreated'));
        setViewMode('list');
        setActiveTab(0); // 내가 요청한 결제 탭으로 이동
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
      t('approval.validation.rejectionReasonPrompt', { defaultValue: '반려 사유를 입력하세요.' }),
      (comment) => {
        void (async () => {
          try {
            const response = await approvalService.rejectApproval(id, comment);
            if (response.success) {
              setSuccess(t('approval.toast.documentRejected'));
              loadApprovalData();
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
        title: t('approval.rejectDialogTitle', { defaultValue: '결재 반려' }),
        label: t('approval.rejectReasonLabel', { defaultValue: '반려 사유' }),
        multiline: true,
        minRows: 3,
        confirmText: t('approval.rejectSubmit', { defaultValue: '반려' }),
        cancelText: t('common.cancel')
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
          const updatedDoc: ApprovalDocument = {
            id: updated.data.id,
            documentId: updated.data.document_id || '',
            title: updated.data.title || '',
            type: updated.data.type || 'other',
            category: updated.data.category || '',
            amount: updated.data.amount ? parseFloat(updated.data.amount) : undefined,
            requesterId: updated.data.requester_id,
            requesterName: updated.data.requester?.username || t('approval.unknownUser'),
            requesterDepartment: updated.data.requester?.department || '-',
            requesterPosition: updated.data.requester?.position || '-',
            description: updated.data.description || '',
            attachments: parseJsonArray(updated.data.attachments),
            status: updated.data.status || 'draft',
            priority: updated.data.priority || 'medium',
            currentApproverId: updated.data.current_approver_id,
            currentApproverName: updated.data.currentApprover?.username,
            approvalFlow: parseJsonArray(updated.data.approval_flow),
            createdAt: updated.data.created_at || new Date().toISOString(),
            updatedAt: updated.data.updated_at || new Date().toISOString(),
            dueDate: updated.data.due_date,
            comments: parseJsonArray(updated.data.comments)
          };
          setSelectedDocument(updatedDoc);
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

  if (viewMode === 'view' && selectedDocument) {
    const escalationCount = getEscalationCount(selectedDocument);
    const escalationLimitReached = escalationCount >= 4;
    const isCurrentApprover = selectedDocument.currentApproverId === user?.id;
    const canEscalate = isCurrentApprover && (selectedDocument.status === 'submitted' || selectedDocument.status === 'in_review') && !escalationLimitReached;

    return (
      <Box sx={{ 
        p: 0,
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%',
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          backgroundColor: 'background.paper',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'text.secondary'
          },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: 'primary.main',
          borderWidth: 1,
        }
        },
        '& .MuiInputBase-input::placeholder': {
          color: 'text.secondary',
          opacity: 0.75
        }
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Typography
            variant="pageTitle"
            component="h1"
            sx={{
              fontSize: { xs: '1.125rem', sm: '1.3125rem' },
              fontWeight: 600,
              letterSpacing: '-0.022em',
              lineHeight: 1.28,
            }}
          >
            {t('approval.detailPageTitle')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            {t('approval.backToList')}
          </Button>
        </Box>

        <Card>
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
                          const label = typeof file === 'string' ? file : (file.name || file.storedName || 'attachment');
                          return (
                            <ListItem
                              key={`${label}-${index}`}
                              secondaryAction={
                                <IconButton size="small" onClick={() => handleDownloadAttachment(file)}>
                                  <DownloadIcon />
                                </IconButton>
                              }
                            >
                              <ListItemText primary={label} />
                            </ListItem>
                          );
                        })}
                      </List>
                    </Box>
                  );
                })()}
              </Card>
            </Box>

            {/* 결재 흐름 - 카드형(좌측 이미지 스타일) */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('approval.detail.approvalFlow')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {selectedDocument.approvalFlow.map((step) => {
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

            {/* 에스컬레이션 */}
            {isCurrentApprover && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{t('approval.detail.escalationSection')}</Typography>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Autocomplete
                        options={users.filter(u => u.id !== user?.id && u.id !== selectedDocument.requesterId)}
                        getOptionLabel={(option) => `${option.username}${option.department ? ` (${option.department})` : ''}`}
                        value={users.find(u => u.id === escalateTo) || null}
                        onChange={(event, newValue) => setEscalateTo(newValue?.id || null)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('approval.escalateTo')}
                            placeholder={t('approval.selectApprover')}
                            size="small"
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
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color={escalationLimitReached ? 'error.main' : 'text.secondary'}>
                        {t('approval.escalationCount', { current: escalationCount, max: 4 })}
                      </Typography>
                      <Button
                        variant="contained"
                        color="info"
                        startIcon={<ReplyIcon />}
                        onClick={handleEscalateDocument}
                        disabled={!canEscalate || !escalateTo || escalating}
                      >
                        {t('approval.escalate')}
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            )}

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
              {selectedDocument.status === 'in_review' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
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
                    color="error"
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
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography component="h1" sx={{ ...mvsPageTitleSx, color: 'text.primary' }}>
          {t('approval.pageTitle')}
        </Typography>
      </Box>

      {/* 탭 네비게이션 */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '16px',
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.1 : 0.35)}`,
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 2px 12px rgba(0,0,0,0.25)',
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            if (newValue === 2) {
              // 결제 문서 작성 탭
              if (viewMode !== 'create' && viewMode !== 'edit') {
                handleAdd();
              }
            } else {
              // 목록 탭들
              setViewMode('list');
              setSelectedDocument(null);
            }
          }}
          sx={{
            px: 1,
            minHeight: 48,
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: '2px 2px 0 0',
              bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.85)' : theme.palette.grey[300],
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: 'text.secondary',
              minHeight: 48,
            },
            '& .MuiTab-root.Mui-selected': {
              color: 'text.primary',
              fontWeight: 600,
            },
          }}
        >
          <Tab
            label={t('approval.myRequests')}
            disabled={approvalMenuFlags.menusLoading || !approvalMenuFlags.canRead}
          />
          <Tab
            label={t('approval.received')}
            disabled={approvalMenuFlags.menusLoading || !approvalMenuFlags.canRead}
          />
          <Tab
            label={t('approval.createDocument')}
            disabled={approvalMenuFlags.menusLoading || !approvalMenuFlags.canCreate}
          />
        </Tabs>
      </Card>

      {(viewMode === 'create' || viewMode === 'edit') && (
        <Card sx={{ 
          mb: 3,
          elevation: 0,
          boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)', 
          bgcolor: 'background.paper',
          borderRadius: '20px',
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.35 : 0.1)}`,
          maxWidth: '100%',
        }}>
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
                    <Box
                      component="img"
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
                    {t('approval.documentNumber')}
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
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  borderRadius: '14px',
                  p: 1.25,
                  bgcolor: 'background.paper',
                  boxShadow: '0 1px 6px rgba(15, 23, 42, 0.04)',
                }}>
                  {approvalFlowLabels.map((label, flowIdx) => (
                    <Box key={label} sx={{ 
                      border: `1px dashed ${alpha(theme.palette.divider, 0.95)}`,
                      borderRadius: '12px',
                      minHeight: 58,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 0.5,
                      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      {flowIdx === 0 && user?.username && (
                        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                          {user.username}
                        </Typography>
                      )}
                    </Box>
                  ))}
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
                    borderColor: alpha(theme.palette.divider, 0.9),
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
                    borderColor: alpha(theme.palette.divider, 0.75),
                    letterSpacing: '-0.01em',
                  }}>
                  {t('approval.approverSectionTitle')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('approval.approverFieldLabel')}
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
                        placeholder={t('approval.selectApprover')}
                        variant="outlined"
                        size="small"
                        inputRef={approverInputRef}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05),
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: alpha(theme.palette.primary.main, 0.45),
                              },
                            },
                          },
                        }}
                      />
                    )}
                  />
                </Box>
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
                    borderColor: alpha(theme.palette.divider, 0.9),
                    letterSpacing: '-0.01em',
                  }}>
                  {t('approval.paymentDetails')}
                </Typography>
                <Grid
                  container
                  spacing={2}
                  alignItems="flex-start"
                  sx={{
                    '& .MuiFormControl-root': { mt: 0 },
                    '& .MuiInputLabel-root': { lineHeight: 1.2 }
                  }}
                >
                  {/* 왼쪽 컬럼 */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('approval.titleLabel')} **
                        </Typography>
                        <TextField
                          fullWidth
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          variant="outlined"
                          size="small"
                          inputRef={titleInputRef}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              },
                              '&.Mui-focused': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderWidth: 2
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('approval.category')}
                        </Typography>
                        <TextField
                          fullWidth
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          variant="outlined"
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('approval.priority')}
                        </Typography>
                        <FormControl fullWidth variant="outlined" size="small">
                          <Select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                            sx={{
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              }
                            }}
                          >
                            <MenuItem value="low">{t('approval.low')}</MenuItem>
                            <MenuItem value="medium">{t('approval.normal')}</MenuItem>
                            <MenuItem value="high">{t('approval.high')}</MenuItem>
                            <MenuItem value="urgent">{t('approval.urgent')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Grid>

                  {/* 오른쪽 컬럼 */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('approval.type')} *
                        </Typography>
                        <FormControl fullWidth variant="outlined" size="small">
                          <Select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            sx={{
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              }
                            }}
                          >
                            <MenuItem value="expense">{t('approval.expense')}</MenuItem>
                            <MenuItem value="purchase">{t('approval.purchase')}</MenuItem>
                            <MenuItem value="contract">{t('approval.contract')}</MenuItem>
                            <MenuItem value="other">{t('approval.other')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('approval.amount')}
                        </Typography>
                        <TextField
                          fullWidth
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          variant="outlined"
                          size="small"
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>Rs.</Typography>
                        }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('approval.deadline')}
                        </Typography>
                        <TextField
                          fullWidth
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          variant="outlined"
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'primary.main'
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {/* 설명 섹션 - 전체 너비 */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700, fontSize: '15px', color: 'text.primary', letterSpacing: '-0.01em' }}>
                    {t('approval.description')} **
                  </Typography>
                  <Box sx={{
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    borderRadius: '14px',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 280,
                    boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.divider, 0.06)}`,
                    '& .tiptap': {
                      flex: 1,
                      minHeight: 230,
                      p: 2.25,
                      outline: 'none',
                      fontSize: '0.875rem',
                      backgroundImage: `repeating-linear-gradient(to bottom, ${theme.palette.background.paper}, ${theme.palette.background.paper} 27px, ${alpha(theme.palette.divider, 0.35)} 28px)`,
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
                      '& [style*="font-size"]': {
                        // fontSize 스타일 지원
                      }
                    }
                  }}>
                          {/* 툴바 */}
                          {editor && (
                            <Box sx={{
                              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.05),
                              p: 1.25,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 0.65,
                              alignItems: 'center',
                              borderTopLeftRadius: 13,
                              borderTopRightRadius: 13,
                            }}>
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
                                  sx={{ height: 32 }}
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
                                  sx={{ height: 32 }}
                                >
                                  <MenuItem value="12px">12px</MenuItem>
                                  <MenuItem value="14px">14px</MenuItem>
                                  <MenuItem value="16px">16px</MenuItem>
                                  <MenuItem value="18px">18px</MenuItem>
                                  <MenuItem value="24px">24px</MenuItem>
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
                          )}
                    {/* 에디터 */}
                    <EditorContent editor={editor} />
                    
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
                  borderColor: alpha(theme.palette.divider, 0.9),
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
                        borderColor: alpha(theme.palette.divider, 0.95),
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: alpha(theme.palette.primary.main, 0.5),
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
                      const label = typeof file === 'string' ? file : (file.name || file.storedName || 'attachment');
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
                            border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.08),
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <AttachFileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            <Typography
                              variant="body2"
                              sx={{ flex: 1, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                              onClick={() => handleDownloadAttachment(file)}
                            >
                              {label}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
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
                    setActiveTab(0);
                    setSelectedDocument(null);
                  }}
                  disabled={saving}
                  sx={{
                    borderRadius: '12px',
                    px: 3,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: 100,
                    borderColor: alpha(theme.palette.divider, 0.95),
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: alpha(theme.palette.text.primary, 0.2),
                      bgcolor: alpha(theme.palette.grey[500], 0.06),
                    },
                  }}
                >
                  {t('approval.cancel')}
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{
                    borderRadius: '12px',
                    px: 3,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: 120,
                  }}
                >
                  {saving ? t('approval.saving') : (selectedDocument ? t('approval.update') : t('approval.create'))}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 통계 카드 - 목록 모드일 때만 표시 */}
      {viewMode === 'list' && activeTab !== 2 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
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
            <Card
              key={stat.label}
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
                boxShadow:
                  theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
                bgcolor: 'background.paper',
              }}
            >
              <CardContent sx={{ py: 2, px: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em', color: 'text.secondary' }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: stat.color }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* 필터 및 검색 - 목록 모드일 때만 표시 */}
      {viewMode === 'list' && activeTab !== 2 && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: '16px',
            border: 'none',
            boxShadow: 'none',
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.03),
          }}
        >
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder={t('approval.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.1)' : undefined,
                  },
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel>{t('approval.status')}</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">{t('approval.all')}</MenuItem>
                <MenuItem value="draft">{t('approval.draft')}</MenuItem>
                <MenuItem value="submitted">{t('approval.submitted')}</MenuItem>
                <MenuItem value="in_review">{t('approval.inReview')}</MenuItem>
                <MenuItem value="approved">{t('approval.approved')}</MenuItem>
                <MenuItem value="rejected">{t('approval.rejected')}</MenuItem>
                <MenuItem value="cancelled">{t('approval.cancelled')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('approval.type')}</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">{t('approval.all')}</MenuItem>
                <MenuItem value="expense">{t('approval.expense')}</MenuItem>
                <MenuItem value="purchase">{t('approval.purchase')}</MenuItem>
                <MenuItem value="contract">{t('approval.contract')}</MenuItem>
                <MenuItem value="other">{t('approval.other')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('approval.priority')}</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="">{t('approval.all')}</MenuItem>
                <MenuItem value="low">{t('approval.low')}</MenuItem>
                <MenuItem value="medium">{t('approval.normal')}</MenuItem>
                <MenuItem value="high">{t('approval.high')}</MenuItem>
                <MenuItem value="urgent">{t('approval.urgent')}</MenuItem>
              </Select>
            </FormControl>
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
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              {t('approval.reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>
      )}

      {/* 결재 문서 목록 테이블 - 목록 모드일 때만 표시 */}
      {viewMode === 'list' && activeTab !== 2 && (
        <Card
          elevation={0}
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
            boxShadow:
              theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
            bgcolor: 'background.paper',
          }}
        >
        <TableContainer sx={{ bgcolor: 'transparent' }}>
          <Table
            sx={{
              borderCollapse: 'collapse',
              '& .MuiTableCell-root': {
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
              },
            }}
          >
            <TableHead
              sx={{
                '& .MuiTableCell-head': {
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.04),
                  color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  borderBottom: `1px solid ${
                    theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                  }`,
                  py: 1.5,
                  px: 2,
                  '& .MuiTableSortLabel-root': { color: 'inherit' },
                  '& .MuiTableSortLabel-root.Mui-active': {
                    color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.92)' : theme.palette.grey[100],
                  },
                },
              }}
            >
              <TableRow>
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
            <TableBody
              sx={{
                '& .MuiTableCell-body': {
                  py: 1.5,
                  px: 2,
                  fontSize: '0.875rem',
                  borderBottom: `1px solid ${
                    theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                  }`,
                },
                '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
                  borderBottom: 'none',
                },
              }}
            >
              {paginatedDocuments.map((document) => (
                <TableRow 
                  key={document.id} 
                  hover 
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleViewDocument(document)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {document.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {document.documentId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          mr: 1.5,
                          width: 36,
                          height: 36,
                          bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                          color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.55)' : theme.palette.grey[300],
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {document.requesterName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {document.requesterDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getTypeChip(document.type)}
                  </TableCell>
                  <TableCell>{getStatusChip(document.status)}</TableCell>
                  <TableCell>{getPriorityChip(document.priority)}</TableCell>
                  <TableCell>{formatDateTime(document.createdAt)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {document.status === 'in_review' && (
                        <>
                          <Tooltip title={t('approval.approve')}>
                            <IconButton 
                              size="small" 
                              onClick={(event) => {
                                event.stopPropagation();
                                handleApproveDocument(document.id);
                              }}
                              color="success"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('approval.reject')}>
                            <IconButton 
                              size="small" 
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRejectDocument(document.id);
                              }}
                              color="error"
                            >
                              <CancelIcon />
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

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5, px: 2 }}>
          <Pagination
            count={Math.ceil(filteredDocuments.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            shape="rounded"
            siblingCount={1}
            boundaryCount={1}
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '10px',
                fontWeight: 600,
                minWidth: 36,
                height: 36,
              },
              '& .Mui-selected': {
                bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                color: 'text.primary',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : alpha(theme.palette.common.white, 0.16),
                },
              },
            }}
          />
        </Box>
      </Card>
      )}

      {/* 상세 보기 다이얼로그 */}
      <Dialog
        open={detailDialogOpen && !!selectedDocument}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          결재 문서 상세
          <IconButton onClick={() => setDetailDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDocument && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {(() => {
                const pendingStep = selectedDocument.approvalFlow.find(step => step.status === 'pending');
                const approverName = pendingStep?.approverName || selectedDocument.currentApproverName || '-';
                const approverDept = pendingStep?.approverDepartment || '-';
                const approverPos = pendingStep?.approverPosition || '-';
                return (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">결재 대상</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{approverName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">결재 대상 부서/직책</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {approverDept} {approverPos}
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}
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
                      const label = typeof file === 'string' ? file : (file.name || file.storedName || 'attachment');
                      return (
                        <ListItem key={`${label}-${index}`}>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                onClick={() => handleDownloadAttachment(file)}
                              >
                                {label}
                              </Typography>
                            }
                          />
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
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailDialogOpen(false)} variant="outlined">
            닫기
          </Button>
          {selectedDocument && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setDetailDialogOpen(false);
                handleEditDocument(selectedDocument);
              }}
            >
              수정
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
        message={promptDialogState.message}
        label={promptDialogState.label}
        defaultValue={promptDialogState.defaultValue}
        placeholder={promptDialogState.placeholder}
        multiline={promptDialogState.multiline}
        minRows={promptDialogState.minRows}
        confirmText={promptDialogState.confirmText}
        cancelText={promptDialogState.cancelText}
        required={promptDialogState.required}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />

      {/* 스낵바 */}
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
