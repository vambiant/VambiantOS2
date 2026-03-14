'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronRight,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Grid3X3,
  List,
  Search,
  Upload,
  X,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
} from '@vambiant/ui';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: string;
  uploadedBy?: { name: string; initials: string };
  uploadedAt?: string;
  category?: string;
  path: string;
  children?: FileItem[];
}

const mockFiles: FileItem[] = [
  {
    id: 'f1',
    name: 'LP 1 - Grundlagenermittlung',
    type: 'folder',
    path: '/LP 1 - Grundlagenermittlung',
    children: [
      { id: 'f1a', name: 'Bedarfsprogramm_v2.pdf', type: 'file', mimeType: 'pdf', size: '2,4 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2025-11-01', category: 'Bericht', path: '/LP 1 - Grundlagenermittlung/Bedarfsprogramm_v2.pdf' },
      { id: 'f1b', name: 'Raumprogramm.xlsx', type: 'file', mimeType: 'xlsx', size: '856 KB', uploadedBy: { name: 'Anna Schmidt', initials: 'AS' }, uploadedAt: '2025-11-10', category: 'Tabelle', path: '/LP 1 - Grundlagenermittlung/Raumprogramm.xlsx' },
      { id: 'f1c', name: 'Baugrundgutachten.pdf', type: 'file', mimeType: 'pdf', size: '5,1 MB', uploadedBy: { name: 'Thomas Müller', initials: 'TM' }, uploadedAt: '2025-11-15', category: 'Gutachten', path: '/LP 1 - Grundlagenermittlung/Baugrundgutachten.pdf' },
      { id: 'f1d', name: 'Grundstueck_Foto_01.jpg', type: 'file', mimeType: 'jpg', size: '3,2 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2025-10-05', category: 'Foto', path: '/LP 1 - Grundlagenermittlung/Grundstueck_Foto_01.jpg' },
    ],
  },
  {
    id: 'f2',
    name: 'LP 2 - Vorplanung',
    type: 'folder',
    path: '/LP 2 - Vorplanung',
    children: [
      { id: 'f2a', name: 'Vorentwurf_VarianteA.pdf', type: 'file', mimeType: 'pdf', size: '12,3 MB', uploadedBy: { name: 'Anna Schmidt', initials: 'AS' }, uploadedAt: '2025-12-10', category: 'Zeichnung', path: '/LP 2 - Vorplanung/Vorentwurf_VarianteA.pdf' },
      { id: 'f2b', name: 'Kostenschaetzung_DIN276.xlsx', type: 'file', mimeType: 'xlsx', size: '1,2 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2025-12-28', category: 'Berechnung', path: '/LP 2 - Vorplanung/Kostenschaetzung_DIN276.xlsx' },
      { id: 'f2c', name: 'Vorplanungsbericht.pdf', type: 'file', mimeType: 'pdf', size: '4,5 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2026-01-10', category: 'Bericht', path: '/LP 2 - Vorplanung/Vorplanungsbericht.pdf' },
    ],
  },
  {
    id: 'f3',
    name: 'LP 3 - Entwurfsplanung',
    type: 'folder',
    path: '/LP 3 - Entwurfsplanung',
    children: [
      { id: 'f3a', name: 'Grundriss_EG_1-100.pdf', type: 'file', mimeType: 'pdf', size: '8,7 MB', uploadedBy: { name: 'Stefan Braun', initials: 'SB' }, uploadedAt: '2026-01-30', category: 'Zeichnung', path: '/LP 3 - Entwurfsplanung/Grundriss_EG_1-100.pdf' },
      { id: 'f3b', name: 'Grundriss_OG_1-100.pdf', type: 'file', mimeType: 'pdf', size: '7,9 MB', uploadedBy: { name: 'Stefan Braun', initials: 'SB' }, uploadedAt: '2026-01-30', category: 'Zeichnung', path: '/LP 3 - Entwurfsplanung/Grundriss_OG_1-100.pdf' },
      { id: 'f3c', name: 'Ansicht_Nord.pdf', type: 'file', mimeType: 'pdf', size: '6,1 MB', uploadedBy: { name: 'Anna Schmidt', initials: 'AS' }, uploadedAt: '2026-02-05', category: 'Zeichnung', path: '/LP 3 - Entwurfsplanung/Ansicht_Nord.pdf' },
      { id: 'f3d', name: 'Kostenberechnung_DIN276.xlsx', type: 'file', mimeType: 'xlsx', size: '2,8 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2026-02-15', category: 'Berechnung', path: '/LP 3 - Entwurfsplanung/Kostenberechnung_DIN276.xlsx' },
    ],
  },
  {
    id: 'f4',
    name: 'LP 4 - Genehmigungsplanung',
    type: 'folder',
    path: '/LP 4 - Genehmigungsplanung',
    children: [
      { id: 'f4a', name: 'Bauantrag_komplett.pdf', type: 'file', mimeType: 'pdf', size: '15,4 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2026-03-05', category: 'Antragsformular', path: '/LP 4 - Genehmigungsplanung/Bauantrag_komplett.pdf' },
      { id: 'f4b', name: 'Brandschutzkonzept_v2.1.pdf', type: 'file', mimeType: 'pdf', size: '3,8 MB', uploadedBy: { name: 'Thomas Müller', initials: 'TM' }, uploadedAt: '2026-03-12', category: 'Gutachten', path: '/LP 4 - Genehmigungsplanung/Brandschutzkonzept_v2.1.pdf' },
    ],
  },
  {
    id: 'f5',
    name: 'LP 5 - Ausführungsplanung',
    type: 'folder',
    path: '/LP 5 - Ausführungsplanung',
    children: [
      { id: 'f5a', name: 'Werkplan_Dach_v0.3.dwg', type: 'file', mimeType: 'dwg', size: '22,1 MB', uploadedBy: { name: 'Thomas Müller', initials: 'TM' }, uploadedAt: '2026-03-20', category: 'Zeichnung', path: '/LP 5 - Ausführungsplanung/Werkplan_Dach_v0.3.dwg' },
    ],
  },
  {
    id: 'f6',
    name: 'Allgemein',
    type: 'folder',
    path: '/Allgemein',
    children: [
      { id: 'f6a', name: 'Vertrag_Bauherr.pdf', type: 'file', mimeType: 'pdf', size: '1,2 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2025-09-15', category: 'Vertrag', path: '/Allgemein/Vertrag_Bauherr.pdf' },
      { id: 'f6b', name: 'Projekthandbuch.pdf', type: 'file', mimeType: 'pdf', size: '3,4 MB', uploadedBy: { name: 'Max Mustermann', initials: 'MM' }, uploadedAt: '2025-10-01', category: 'Bericht', path: '/Allgemein/Projekthandbuch.pdf' },
    ],
  },
];

function getFileIcon(mimeType?: string) {
  switch (mimeType) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
      return <FileImage className="h-5 w-5 text-purple-500" />;
    case 'dwg':
    case 'dxf':
      return <File className="h-5 w-5 text-blue-500" />;
    default:
      return <File className="h-5 w-5 text-gray-400" />;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function FilesPage() {
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Navigate into folders
  const getCurrentFolder = (): FileItem[] => {
    if (currentPath.length === 0) return mockFiles;
    let current: FileItem[] = mockFiles;
    for (const pathPart of currentPath) {
      const folder = current.find((f) => f.name === pathPart && f.type === 'folder');
      if (folder?.children) {
        current = folder.children;
      }
    }
    return current;
  };

  const currentItems = getCurrentFolder();
  const allCategories = [...new Set(mockFiles.flatMap((f) => f.children?.map((c) => c.category) || []).filter(Boolean))];

  const filteredItems = currentItems.filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== 'all' && item.type === 'file' && item.category !== categoryFilter) return false;
    return true;
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: Handle file upload
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files.map((f) => f.name));
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Dateien suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat!}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex h-9 items-center rounded-l-md px-2.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex h-9 items-center rounded-r-md border-l px-2.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Hochladen
          </Button>
        </div>
      </div>

      {/* Breadcrumb path */}
      {currentPath.length > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setCurrentPath([])}
          >
            Dateien
          </button>
          {currentPath.map((part, i) => (
            <div key={`${part}-${i}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                type="button"
                className={i === currentPath.length - 1 ? 'font-medium' : 'text-primary hover:underline'}
                onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload drop zone */}
      <div
        className={cn(
          'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Dateien hierher ziehen oder{' '}
          <button type="button" className="text-primary hover:underline">
            durchsuchen
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DWG, XLSX, JPG, PNG bis 100 MB
        </p>
      </div>

      <div className="flex gap-6">
        {/* File browser */}
        <div className="flex-1">
          {viewMode === 'list' ? (
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                      selectedFile?.id === item.id && 'bg-accent/30',
                    )}
                    onClick={() => {
                      if (item.type === 'folder') {
                        setCurrentPath([...currentPath, item.name]);
                        setSelectedFile(null);
                      } else {
                        setSelectedFile(item);
                      }
                    }}
                  >
                    {item.type === 'folder' ? (
                      <FolderOpen className="h-5 w-5 shrink-0 text-yellow-500" />
                    ) : (
                      getFileIcon(item.mimeType)
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {item.type === 'folder' ? (
                        <p className="text-xs text-muted-foreground">
                          {item.children?.length || 0} Dateien
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {item.size} &middot; {item.category}
                        </p>
                      )}
                    </div>
                    {item.type === 'file' && item.uploadedBy && (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                          {item.uploadedBy.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {item.type === 'file' && item.uploadedAt && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(item.uploadedAt)}
                      </span>
                    )}
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="py-12 text-center">
                    <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Keine Dateien gefunden
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selectedFile?.id === item.id && 'ring-2 ring-primary',
                  )}
                  onClick={() => {
                    if (item.type === 'folder') {
                      setCurrentPath([...currentPath, item.name]);
                      setSelectedFile(null);
                    } else {
                      setSelectedFile(item);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
                        {item.type === 'folder' ? (
                          <FolderOpen className="h-8 w-8 text-yellow-500" />
                        ) : (
                          <div className="scale-150">{getFileIcon(item.mimeType)}</div>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium w-full">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.type === 'folder'
                          ? `${item.children?.length || 0} Dateien`
                          : item.size}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {selectedFile && selectedFile.type === 'file' && (
          <div className="hidden w-72 shrink-0 lg:block">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Vorschau</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="rounded-md p-1 hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center rounded-lg bg-muted p-6">
                  <div className="scale-[2]">
                    {getFileIcon(selectedFile.mimeType)}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Name</span>
                    <p className="font-medium break-all">{selectedFile.name}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Größe</span>
                      <p>{selectedFile.size}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Kategorie</span>
                      <p>{selectedFile.category}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Datum</span>
                      <p>{selectedFile.uploadedAt ? formatDate(selectedFile.uploadedAt) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Typ</span>
                      <p className="uppercase">{selectedFile.mimeType}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">Hochgeladen von</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-[9px] font-medium text-primary">
                          {selectedFile.uploadedBy?.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedFile.uploadedBy?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Ansehen
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
