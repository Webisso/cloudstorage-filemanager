import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ChevronRight,
  FilePenLine,
  FolderPlus,
  FolderUp,
  Info,
  Globe,
  Link2,
  LoaderCircle,
  Lock,
  LogOut,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  applyBucketCors,
  createFolder,
  createSpacesClient,
  deleteFile,
  deleteFolder,
  getObjectVisibility,
  listNodes,
  type ObjectVisibility,
  parseSpacesBucketUrl,
  readTextFile,
  renameFile,
  renameFolder,
  type SpaceNode,
  type SpacesCredentials,
  toPublicObjectUrl,
  uploadFileWithProgress,
  writeTextFile,
} from "@/lib/spaces"

type Locale = "tr" | "en"
type ProviderId = "digitalocean_spaces" | "amazon_s3" | "cloudflare_r2"
type AppMode = "signed-out" | "restoring" | "ready"
type VisibilityState = ObjectVisibility | "checking" | "unknown"
type UploadMode = "batch" | "per-file"
type UploadStatus = "queued" | "uploading" | "uploaded" | "failed"

type UploadDraft = {
  id: string
  file: File
  visibility: ObjectVisibility
  status: UploadStatus
  progressPercent: number
  speedMbps: number
  error?: string
}

type PersistedState = {
  locale: Locale
  provider: ProviderId
  credentials: SpacesCredentials
  keepSignedIn: boolean
  isAuthenticated: boolean
  lastPrefix: string
}

type TranslationSet = {
  appName: string
  productBy: string
  restoringSession: string
  restoringHint: string
  language: string
  loginTitle: string
  loginSubtitle: string
  loginPanelTitle: string
  loginPanelDescription: string
  providerLabel: string
  providerPlaceholder: string
  providerUnsupported: string
  bucketUrlLabel: string
  accessKeyLabel: string
  secretKeyLabel: string
  bucketUrlPlaceholder: string
  accessKeyPlaceholder: string
  secretKeyPlaceholder: string
  keepSignedIn: string
  loginButton: string
  loginButtonLoading: string
  loginSecurityNote: string
  loginSecurityHint: string
  featureArchitectureTitle: string
  featureArchitectureDesc: string
  featureOpenSourceTitle: string
  featureOpenSourceDesc: string
  connectInvalidForm: string
  loginSuccess: string
  loginFailed: string
  providerDigitalOcean: string
  providerS3: string
  providerR2: string
  providerSoon: string
  dashboardSubtitle: string
  statusConnected: string
  statusReady: string
  statusProvider: string
  statusBucket: string
  statusRegion: string
  signOut: string
  refresh: string
  uploadFiles: string
  createFolder: string
  deleteSelected: (count: number) => string
  root: string
  parentFolder: string
  tabFiles: string
  tabAbout: string
  tableName: string
  tableType: string
  tableSize: string
  tableDate: string
  tableVisibility: string
  tableAction: string
  visibilityPublic: string
  visibilityPrivate: string
  visibilityChecking: string
  visibilityUnknown: string
  typeFolder: string
  typeFile: string
  emptyFolder: string
  emptyBeforeConnect: string
  copyLink: string
  editText: string
  rename: string
  delete: string
  operationsSummary: string
  activeFolder: string
  uploadProgress: (done: number, total: number) => string
  uploadModalTitle: string
  uploadModalDesc: string
  uploadQueueCount: (count: number) => string
  uploadChooseFiles: string
  uploadAddMore: string
  uploadClearQueue: string
  uploadModeLabel: string
  uploadModeBatch: string
  uploadModePerFile: string
  uploadBulkVisibilityLabel: string
  uploadApplyBulkVisibility: string
  uploadDestinationLabel: string
  uploadListEmpty: string
  uploadFileName: string
  uploadFileType: string
  uploadFileDestination: string
  uploadFileVisibility: string
  uploadFileStatus: string
  uploadFileAction: string
  uploadRemoveFile: string
  uploadStart: string
  uploadSomeFailed: (success: number, total: number) => string
  uploadStatusQueued: string
  uploadStatusUploading: string
  uploadStatusUploaded: string
  uploadStatusFailed: string
  createFolderTitle: string
  createFolderDesc: string
  folderName: string
  folderNamePlaceholder: string
  cancel: string
  create: string
  renameTitle: string
  renameDesc: (name: string) => string
  newName: string
  save: string
  saveAs: string
  textEditorTitle: string
  saveVisibilityTitle: string
  saveVisibilityDesc: string
  saveVisibilityPublic: string
  saveVisibilityPublicDesc: string
  saveVisibilityPrivate: string
  saveVisibilityPrivateDesc: string
  loadingFile: string
  close: string
  deleteConfirmTitle: string
  deleteConfirmDesc: (count: number) => string
  busyCreatingFolder: string
  busyUploadingFiles: string
  busySavingText: string
  busyDeleting: string
  busyRenaming: string
  errorGeneric: string
  errorInvalidCredentials: string
  successFolderCreated: string
  successFilesUploaded: (count: number) => string
  successTextSaved: string
  successLinkCopied: string
  errorLinkCopy: string
  successDeleted: (count: number) => string
  successRenamed: string
  errorRenameRequired: string
}

const APP_STORAGE_KEY = "webisso.s3fm.app-state.v2"

const DEFAULT_CREDENTIALS: SpacesCredentials = {
  accessKeyId: "",
  secretAccessKey: "",
  bucketUrl: "",
}

const I18N: Record<Locale, TranslationSet> = {
  tr: {
    appName: "CloudStorage File Manager",
    productBy: "WebissoLLC tarafından geliştirilmektedir",
    restoringSession: "Oturum geri yükleniyor",
    restoringHint: "Kayıtlı bağlantınız doğrulanıyor ve dosyalar hazırlanıyor.",
    language: "Dil",
    loginTitle: "Yönetim paneline giriş",
    loginSubtitle: "Depolama sağlayıcınızı seçin ve bağlantı bilgilerinizi girerek güvenli şekilde devam edin.",
    loginPanelTitle: "Bağlantı ayarları",
    loginPanelDescription: "Aynı tarayıcıda sonraki ziyaretlerinizde hızlı erişim için oturumunuz korunabilir.",
    providerLabel: "Sağlayıcı",
    providerPlaceholder: "Sağlayıcı seçin",
    providerUnsupported: "Bu sağlayıcı henüz hazırlanıyor.",
    bucketUrlLabel: "Bucket URL",
    accessKeyLabel: "API erişim anahtarı",
    secretKeyLabel: "API gizli anahtarı",
    bucketUrlPlaceholder: "https://lunatic2.sgp1.digitaloceanspaces.com",
    accessKeyPlaceholder: "Örn: DO00XXXXXXXXXXXXXXXX",
    secretKeyPlaceholder: "Gizli anahtarınızı girin",
    keepSignedIn: "Bu cihazda oturumu açık tut",
    loginButton: "Giriş yap ve depolamayı aç",
    loginButtonLoading: "Bağlanıyor",
    loginSecurityNote: "Güvenlik bildirimi",
    loginSecurityHint: "API anahtarlarınız yalnızca bu tarayıcıda, yerel olarak saklanır. Paylaşımlı cihazlarda bu seçeneği dikkatli kullanın.",
    featureArchitectureTitle: "Provider odaklı mimari",
    featureArchitectureDesc: "Bugün DigitalOcean, yarın farklı depolama altyapıları.",
    featureOpenSourceTitle: "Açık kaynak uyumlu",
    featureOpenSourceDesc: "Büyüyen topluluklar için okunabilir ve genişletilebilir yapı.",
    connectInvalidForm: "Lütfen sağlayıcı seçip tüm alanları eksiksiz doldurun.",
    loginSuccess: "Bağlantı başarılı. Depolama alanı hazır.",
    loginFailed: "Bağlantı kurulamadı",
    providerDigitalOcean: "DigitalOcean Spaces",
    providerS3: "Amazon S3",
    providerR2: "Cloudflare R2",
    providerSoon: "Yakında",
    dashboardSubtitle: "Dosyalarınızı görüntüleyin, yönetin ve paylaşın.",
    statusConnected: "Bağlı",
    statusReady: "Hazır",
    statusProvider: "Sağlayıcı",
    statusBucket: "Bucket",
    statusRegion: "Bölge",
    signOut: "Hesap değiştir",
    refresh: "Yenile",
    uploadFiles: "Dosya yükle",
    createFolder: "Klasör oluştur",
    deleteSelected: (count) => `Seçilenleri sil (${count})`,
    root: "kök",
    parentFolder: "Üst klasör",
    tabFiles: "Dosyalar",
    tabAbout: "Durum",
    tableName: "Ad",
    tableType: "Tür",
    tableSize: "Boyut",
    tableDate: "Tarih",
    tableVisibility: "Erişim",
    tableAction: "İşlem",
    visibilityPublic: "Public",
    visibilityPrivate: "Private",
    visibilityChecking: "Kontrol ediliyor",
    visibilityUnknown: "Bilinmiyor",
    typeFolder: "Klasör",
    typeFile: "Dosya",
    emptyFolder: "Bu klasörde dosya bulunamadı.",
    emptyBeforeConnect: "Devam etmek için bağlantı bilgileriyle giriş yapın.",
    copyLink: "Bağlantıyı kopyala",
    editText: "Metin dosyasını düzenle",
    rename: "Yeniden adlandır",
    delete: "Sil",
    operationsSummary: "Bu panelde dosya görüntüleme, çoklu yükleme, klasör oluşturma, silme, yeniden adlandırma, bağlantı kopyalama ve metin düzenleme işlemleri desteklenir.",
    activeFolder: "Aktif klasör",
    uploadProgress: (done, total) => `Yükleme ilerlemesi: ${done}/${total}`,
    uploadModalTitle: "Dosya yükleme merkezi",
    uploadModalDesc: "Birden fazla dosya seçin, hedefi kontrol edin ve erişim izinlerini toplu veya dosya bazlı yönetin.",
    uploadQueueCount: (count) => `Kuyruktaki dosya: ${count}`,
    uploadChooseFiles: "Dosya seç",
    uploadAddMore: "Daha fazla ekle",
    uploadClearQueue: "Kuyruğu temizle",
    uploadModeLabel: "Yükleme tipi",
    uploadModeBatch: "Toplu yükleme",
    uploadModePerFile: "Dosya bazlı yükleme",
    uploadBulkVisibilityLabel: "Toplu izin",
    uploadApplyBulkVisibility: "Toplu izni tüm dosyalara uygula",
    uploadDestinationLabel: "Yükleme hedefi",
    uploadListEmpty: "Henüz dosya seçmediniz. Başlamak için dosya ekleyin.",
    uploadFileName: "Dosya",
    uploadFileType: "Tür",
    uploadFileDestination: "Hedef",
    uploadFileVisibility: "İzin",
    uploadFileStatus: "Durum",
    uploadFileAction: "İşlem",
    uploadRemoveFile: "Çıkar",
    uploadStart: "Yüklemeyi başlat",
    uploadSomeFailed: (success, total) => `${success}/${total} dosya yüklendi. Kalan dosyalarda hata var.`,
    uploadStatusQueued: "Kuyrukta",
    uploadStatusUploading: "Yükleniyor",
    uploadStatusUploaded: "Yüklendi",
    uploadStatusFailed: "Hata",
    createFolderTitle: "Yeni klasör oluştur",
    createFolderDesc: "Klasör, mevcut dizin altına eklenecektir.",
    folderName: "Klasör adı",
    folderNamePlaceholder: "Örn: arşiv-2026",
    cancel: "Vazgeç",
    create: "Oluştur",
    renameTitle: "Yeniden adlandır",
    renameDesc: (name) => `Mevcut ad: ${name}`,
    newName: "Yeni ad",
    save: "Kaydet",
    saveAs: "Bu şekilde kaydet",
    textEditorTitle: "Metin düzenleyici",
    saveVisibilityTitle: "Kaydetme tipi seçin",
    saveVisibilityDesc: "Bu .txt dosyası için erişim türünü belirleyin.",
    saveVisibilityPublic: "Public (herkese açık)",
    saveVisibilityPublicDesc: "Dosya bağlantısını bilen herkes okuyabilir.",
    saveVisibilityPrivate: "Private (erişime kapalı)",
    saveVisibilityPrivateDesc: "Dosya yalnızca yetkili anahtarlarla erişilebilir.",
    loadingFile: "Dosya yükleniyor",
    close: "Kapat",
    deleteConfirmTitle: "Silme işlemi onayı",
    deleteConfirmDesc: (count) => `${count} öğeyi silmek üzeresiniz. Bu işlem geri alınamaz.`,
    busyCreatingFolder: "Klasör oluşturuluyor",
    busyUploadingFiles: "Dosyalar yükleniyor",
    busySavingText: "Metin dosyası kaydediliyor",
    busyDeleting: "Seçili öğeler siliniyor",
    busyRenaming: "Yeniden adlandırma uygulanıyor",
    errorGeneric: "İşlem sırasında beklenmeyen bir hata oluştu.",
    errorInvalidCredentials: "Lütfen geçerli bağlantı bilgileri girin.",
    successFolderCreated: "Klasör oluşturuldu.",
    successFilesUploaded: (count) => `${count} dosya başarıyla yüklendi.`,
    successTextSaved: "Metin dosyası kaydedildi.",
    successLinkCopied: "Bağlantı panoya kopyalandı.",
    errorLinkCopy: "Bağlantı kopyalanamadı.",
    successDeleted: (count) => `${count} öğe silindi.`,
    successRenamed: "Yeniden adlandırma tamamlandı.",
    errorRenameRequired: "Yeni ad boş olamaz.",
  },
  en: {
    appName: "CloudStorage File Manager",
    productBy: "Built by WebissoLLC",
    restoringSession: "Restoring your session",
    restoringHint: "Validating saved connection and preparing your files.",
    language: "Language",
    loginTitle: "Sign in to the management panel",
    loginSubtitle: "Select your storage provider and enter credentials to continue securely.",
    loginPanelTitle: "Connection settings",
    loginPanelDescription: "You can keep the session available on this browser for faster future access.",
    providerLabel: "Provider",
    providerPlaceholder: "Select provider",
    providerUnsupported: "This provider is coming soon.",
    bucketUrlLabel: "Bucket URL",
    accessKeyLabel: "API access key",
    secretKeyLabel: "API secret key",
    bucketUrlPlaceholder: "https://lunatic2.sgp1.digitaloceanspaces.com",
    accessKeyPlaceholder: "Example: DO00XXXXXXXXXXXXXXXX",
    secretKeyPlaceholder: "Enter your secret key",
    keepSignedIn: "Keep me signed in on this device",
    loginButton: "Sign in and open storage",
    loginButtonLoading: "Connecting",
    loginSecurityNote: "Security notice",
    loginSecurityHint: "Your API keys are stored locally in this browser only. Use this option carefully on shared devices.",
    featureArchitectureTitle: "Provider-first architecture",
    featureArchitectureDesc: "DigitalOcean today, other storage backends tomorrow.",
    featureOpenSourceTitle: "Open-source ready",
    featureOpenSourceDesc: "Readable and extensible structure for growing communities.",
    connectInvalidForm: "Please select a provider and fill in all required fields.",
    loginSuccess: "Connection successful. Storage is ready.",
    loginFailed: "Connection failed",
    providerDigitalOcean: "DigitalOcean Spaces",
    providerS3: "Amazon S3",
    providerR2: "Cloudflare R2",
    providerSoon: "Soon",
    dashboardSubtitle: "View, manage, and share your files.",
    statusConnected: "Connected",
    statusReady: "Ready",
    statusProvider: "Provider",
    statusBucket: "Bucket",
    statusRegion: "Region",
    signOut: "Switch account",
    refresh: "Refresh",
    uploadFiles: "Upload files",
    createFolder: "Create folder",
    deleteSelected: (count) => `Delete selected (${count})`,
    root: "root",
    parentFolder: "Parent folder",
    tabFiles: "Files",
    tabAbout: "Status",
    tableName: "Name",
    tableType: "Type",
    tableSize: "Size",
    tableDate: "Date",
    tableVisibility: "Access",
    tableAction: "Action",
    visibilityPublic: "Public",
    visibilityPrivate: "Private",
    visibilityChecking: "Checking",
    visibilityUnknown: "Unknown",
    typeFolder: "Folder",
    typeFile: "File",
    emptyFolder: "No files found in this folder.",
    emptyBeforeConnect: "Sign in with connection details to continue.",
    copyLink: "Copy link",
    editText: "Edit text file",
    rename: "Rename",
    delete: "Delete",
    operationsSummary: "This panel supports file browsing, multi-upload, folder creation, delete, rename, link copy, and text editing.",
    activeFolder: "Active folder",
    uploadProgress: (done, total) => `Upload progress: ${done}/${total}`,
    uploadModalTitle: "Upload center",
    uploadModalDesc: "Select multiple files, review destination, and manage permissions in batch or per file.",
    uploadQueueCount: (count) => `Files in queue: ${count}`,
    uploadChooseFiles: "Choose files",
    uploadAddMore: "Add more",
    uploadClearQueue: "Clear queue",
    uploadModeLabel: "Upload mode",
    uploadModeBatch: "Batch upload",
    uploadModePerFile: "Per-file upload",
    uploadBulkVisibilityLabel: "Batch visibility",
    uploadApplyBulkVisibility: "Apply batch visibility to all files",
    uploadDestinationLabel: "Upload destination",
    uploadListEmpty: "No files selected yet. Add files to start.",
    uploadFileName: "File",
    uploadFileType: "Type",
    uploadFileDestination: "Destination",
    uploadFileVisibility: "Visibility",
    uploadFileStatus: "Status",
    uploadFileAction: "Action",
    uploadRemoveFile: "Remove",
    uploadStart: "Start upload",
    uploadSomeFailed: (success, total) => `${success}/${total} files uploaded. Some files failed.`,
    uploadStatusQueued: "Queued",
    uploadStatusUploading: "Uploading",
    uploadStatusUploaded: "Uploaded",
    uploadStatusFailed: "Failed",
    createFolderTitle: "Create new folder",
    createFolderDesc: "The folder will be created under the current directory.",
    folderName: "Folder name",
    folderNamePlaceholder: "Example: archive-2026",
    cancel: "Cancel",
    create: "Create",
    renameTitle: "Rename",
    renameDesc: (name) => `Current name: ${name}`,
    newName: "New name",
    save: "Save",
    saveAs: "Save this way",
    textEditorTitle: "Text editor",
    saveVisibilityTitle: "Choose save visibility",
    saveVisibilityDesc: "Select how this .txt file should be stored.",
    saveVisibilityPublic: "Public (publicly accessible)",
    saveVisibilityPublicDesc: "Anyone with the link can read this file.",
    saveVisibilityPrivate: "Private (restricted)",
    saveVisibilityPrivateDesc: "Only authorized credentials can access this file.",
    loadingFile: "Loading file",
    close: "Close",
    deleteConfirmTitle: "Delete confirmation",
    deleteConfirmDesc: (count) => `You are about to delete ${count} item(s). This action cannot be undone.`,
    busyCreatingFolder: "Creating folder",
    busyUploadingFiles: "Uploading files",
    busySavingText: "Saving text file",
    busyDeleting: "Deleting selected items",
    busyRenaming: "Applying rename",
    errorGeneric: "An unexpected error occurred.",
    errorInvalidCredentials: "Please enter valid connection details.",
    successFolderCreated: "Folder created.",
    successFilesUploaded: (count) => `${count} file(s) uploaded successfully.`,
    successTextSaved: "Text file saved.",
    successLinkCopied: "Link copied to clipboard.",
    errorLinkCopy: "Link could not be copied.",
    successDeleted: (count) => `${count} item(s) deleted.`,
    successRenamed: "Rename completed.",
    errorRenameRequired: "New name cannot be empty.",
  },
}

const PROVIDERS: Array<{ id: ProviderId; enabled: boolean }> = [
  { id: "digitalocean_spaces", enabled: true },
  { id: "amazon_s3", enabled: false },
  { id: "cloudflare_r2", enabled: false },
]

function getProviderLabel(locale: Locale, provider: ProviderId): string {
  const text = I18N[locale]

  if (provider === "digitalocean_spaces") return text.providerDigitalOcean
  if (provider === "amazon_s3") return text.providerS3
  return text.providerR2
}

function formatBytes(value: number): string {
  if (value === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / Math.pow(1024, unitIndex)
  return `${amount.toFixed(amount > 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatTimestamp(date: Date | undefined, locale: Locale): string {
  if (!date) return "-"

  const dateLocale = locale === "tr" ? "tr-TR" : "en-US"
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getParentPrefix(prefix: string): string {
  const cleaned = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix
  const parts = cleaned.split("/").filter(Boolean)

  if (parts.length <= 1) {
    return ""
  }

  return `${parts.slice(0, -1).join("/")}/`
}

function buildRenamedKey(prefix: string, value: string, isFolder: boolean): string {
  const trimmed = value.trim().replaceAll("\\", "/")
  if (!trimmed) {
    return ""
  }

  const sanitized = isFolder ? trimmed.replace(/\/+$/g, "") : trimmed
  return isFolder ? `${prefix}${sanitized}/` : `${prefix}${sanitized}`
}

function makeUploadDraft(file: File, visibility: ObjectVisibility): UploadDraft {
  const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`

  return {
    id,
    file,
    visibility,
    status: "queued",
    progressPercent: 0,
    speedMbps: 0,
  }
}

function buildUploadDestination(prefix: string, fileName: string): string {
  return `/${prefix}${fileName}`
}

function App() {
  const [locale, setLocale] = useState<Locale>("tr")
  const [provider, setProvider] = useState<ProviderId>("digitalocean_spaces")
  const [credentials, setCredentials] = useState<SpacesCredentials>(DEFAULT_CREDENTIALS)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [appMode, setAppMode] = useState<AppMode>("signed-out")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [restoreComplete, setRestoreComplete] = useState(false)

  const [currentPrefix, setCurrentPrefix] = useState("")
  const [nodes, setNodes] = useState<SpaceNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyMessage, setBusyMessage] = useState<string | null>(null)

  const [newFolderName, setNewFolderName] = useState("")
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)

  const [renameTarget, setRenameTarget] = useState<SpaceNode | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const [deleteTargets, setDeleteTargets] = useState<SpaceNode[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  const [editorTarget, setEditorTarget] = useState<SpaceNode | null>(null)
  const [editorContent, setEditorContent] = useState("")
  const [editorLoading, setEditorLoading] = useState(false)
  const [isSaveVisibilityOpen, setIsSaveVisibilityOpen] = useState(false)
  const [pendingSaveVisibility, setPendingSaveVisibility] = useState<ObjectVisibility>("private")
  const [visibilityByKey, setVisibilityByKey] = useState<Record<string, VisibilityState>>({})

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<UploadMode>("batch")
  const [bulkUploadVisibility, setBulkUploadVisibility] = useState<ObjectVisibility>("private")
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([])

  const uploadPickerRef = useRef<HTMLInputElement>(null)
  const visibilityRunRef = useRef(0)

  const text = I18N[locale]

  const providerEnabled = useMemo(
    () => PROVIDERS.some((item) => item.id === provider && item.enabled),
    [provider]
  )

  const hasRequiredCredentials =
    credentials.accessKeyId.trim() !== "" &&
    credentials.secretAccessKey.trim() !== "" &&
    credentials.bucketUrl.trim() !== ""

  const parsedPreview = useMemo(() => {
    if (!credentials.bucketUrl.trim() || provider !== "digitalocean_spaces") {
      return null
    }

    try {
      return parseSpacesBucketUrl(credentials.bucketUrl)
    } catch {
      return null
    }
  }, [credentials.bucketUrl, provider])

  const connection = useMemo(() => {
    if (!hasRequiredCredentials || provider !== "digitalocean_spaces") {
      return null
    }

    try {
      return createSpacesClient(credentials)
    } catch {
      return null
    }
  }, [credentials, hasRequiredCredentials, provider])

  const breadcrumbs = useMemo(() => {
    const parts = currentPrefix.split("/").filter(Boolean)
    const steps = [{ label: text.root, prefix: "" }]
    let acc = ""

    for (const part of parts) {
      acc = `${acc}${part}/`
      steps.push({
        label: part,
        prefix: acc,
      })
    }

    return steps
  }, [currentPrefix, text.root])

  useEffect(() => {
    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) {
      setRestoreComplete(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      const nextLocale = parsed.locale === "en" ? "en" : "tr"
      const nextProvider = parsed.provider ?? "digitalocean_spaces"

      setLocale(nextLocale)
      setProvider(nextProvider)
      setCredentials({
        accessKeyId: parsed.credentials?.accessKeyId ?? "",
        secretAccessKey: parsed.credentials?.secretAccessKey ?? "",
        bucketUrl: parsed.credentials?.bucketUrl ?? "",
      })
      setKeepSignedIn(parsed.keepSignedIn ?? true)

      if (
        parsed.keepSignedIn &&
        parsed.isAuthenticated &&
        parsed.provider === "digitalocean_spaces" &&
        parsed.credentials?.accessKeyId &&
        parsed.credentials?.secretAccessKey &&
        parsed.credentials?.bucketUrl
      ) {
        setAppMode("restoring")
      }
    } catch {
      localStorage.removeItem(APP_STORAGE_KEY)
    } finally {
      setRestoreComplete(true)
    }
  }, [])

  useEffect(() => {
    if (!restoreComplete) {
      return
    }

    const payload: PersistedState = {
      locale,
      provider,
      credentials,
      keepSignedIn,
      isAuthenticated,
      lastPrefix: currentPrefix,
    }

    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload))
  }, [
    locale,
    provider,
    credentials,
    keepSignedIn,
    isAuthenticated,
    currentPrefix,
    restoreComplete,
  ])

  useEffect(() => {
    if (appMode !== "restoring" || !restoreComplete) {
      return
    }

    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) {
      setAppMode("signed-out")
      return
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      void connectAndLoad(parsed.lastPrefix ?? "", {
        silentSuccess: true,
        onError: () => {
          setIsAuthenticated(false)
          setAppMode("signed-out")
        },
      })
    } catch {
      setIsAuthenticated(false)
      setAppMode("signed-out")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, restoreComplete])

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((key) => nodes.some((node) => node.key === key)))
  }, [nodes])

  function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback
  }

  function getVisibilityLabel(visibility: VisibilityState): string {
    if (visibility === "public") return text.visibilityPublic
    if (visibility === "private") return text.visibilityPrivate
    if (visibility === "checking") return text.visibilityChecking
    return text.visibilityUnknown
  }

  function getUploadStatusLabel(status: UploadStatus): string {
    if (status === "uploading") return text.uploadStatusUploading
    if (status === "uploaded") return text.uploadStatusUploaded
    if (status === "failed") return text.uploadStatusFailed
    return text.uploadStatusQueued
  }

  async function connectAndLoad(
    prefix = "",
    options?: { silentSuccess?: boolean; onError?: () => void }
  ): Promise<boolean> {
    if (!providerEnabled || provider !== "digitalocean_spaces" || !connection) {
      toast.error(text.errorInvalidCredentials)
      options?.onError?.()
      return false
    }

    setIsLoading(true)

    try {
      const items = await listNodes(connection.client, connection.parsed.bucket, prefix)
      setNodes(items)
      setCurrentPrefix(prefix)
      setIsAuthenticated(true)
      setAppMode("ready")
      setSelectedKeys([])
      visibilityRunRef.current += 1

      const fileNodes = items.filter((item) => item.type === "file")
      if (fileNodes.length > 0) {
        const runId = visibilityRunRef.current
        const nextState: Record<string, VisibilityState> = {}
        fileNodes.forEach((node) => {
          nextState[node.key] = "checking"
        })
        setVisibilityByKey(nextState)

        void Promise.all(
          fileNodes.map(async (node): Promise<readonly [string, VisibilityState]> => {
            try {
              const visibility = await getObjectVisibility(
                connection.client,
                connection.parsed.bucket,
                node.key
              )
              return [node.key, visibility] as const
            } catch {
              return [node.key, "unknown" as const]
            }
          })
        ).then((results) => {
          if (visibilityRunRef.current !== runId) {
            return
          }

          const resolved: Record<string, VisibilityState> = {}
          results.forEach(([key, visibility]) => {
            resolved[key] = visibility
          })
          setVisibilityByKey(resolved)
        })
      } else {
        setVisibilityByKey({})
      }

      // Apply CORS policy so the app works from any origin (e.g. GitHub Pages).
      // Runs silently — a failure here does not block the user.
      applyBucketCors(connection.client, connection.parsed.bucket).catch(() => undefined)

      if (!options?.silentSuccess) {
        toast.success(text.loginSuccess)
      }

      return true
    } catch (error) {
      toast.error(getErrorMessage(error, text.loginFailed))
      options?.onError?.()
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogin(): Promise<void> {
    if (!providerEnabled || !hasRequiredCredentials) {
      toast.error(text.connectInvalidForm)
      return
    }

    await connectAndLoad("")
  }

  function updateCredential(field: keyof SpacesCredentials, value: string): void {
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function handleSignOut(): void {
    setIsAuthenticated(false)
    setAppMode("signed-out")
    setNodes([])
    setCurrentPrefix("")
    setSelectedKeys([])
  }

  function queueFilesForUpload(files: File[]): void {
    if (files.length === 0) {
      return
    }

    setUploadDrafts((prev) => [
      ...prev,
      ...files.map((file) => makeUploadDraft(file, bulkUploadVisibility)),
    ])
  }

  function handleUploadPickerChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    queueFilesForUpload(files)
  }

  function applyBulkVisibilityToQueuedFiles(): void {
    setUploadDrafts((prev) => prev.map((item) => ({ ...item, visibility: bulkUploadVisibility })))
  }

  async function handleUploadFromQueue(): Promise<void> {
    if (!connection || uploadDrafts.length === 0) {
      return
    }

    const queue = [...uploadDrafts]
    let successCount = 0

    setBusyMessage(text.busyUploadingFiles)
    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index]
        const visibility = uploadMode === "batch" ? bulkUploadVisibility : item.visibility

        setUploadDrafts((prev) =>
          prev.map((draft) =>
            draft.id === item.id
              ? {
                  ...draft,
                  status: "uploading",
                  progressPercent: 0,
                  speedMbps: 0,
                  error: undefined,
                }
              : draft
          )
        )

        try {
          const speedWindow: Array<{ time: number; loadedBytes: number }> = []
          await uploadFileWithProgress(
            connection.client,
            connection.parsed.bucket,
            `${currentPrefix}${item.file.name}`,
            item.file,
            visibility,
            (loadedBytes, totalBytes) => {
              const now = performance.now()
              speedWindow.push({ time: now, loadedBytes })

              while (speedWindow.length > 1 && now - speedWindow[0].time > 1000) {
                speedWindow.shift()
              }

              let speedMbps = 0
              if (speedWindow.length >= 2) {
                const first = speedWindow[0]
                const last = speedWindow[speedWindow.length - 1]
                const elapsedSec = Math.max((last.time - first.time) / 1000, 0.001)
                const deltaBytes = Math.max(last.loadedBytes - first.loadedBytes, 0)
                speedMbps = (deltaBytes / (1024 * 1024)) / elapsedSec
              }

              const basis = totalBytes > 0 ? totalBytes : item.file.size
              const progressPercent = basis > 0 ? Math.min(100, (loadedBytes / basis) * 100) : 0

              setUploadDrafts((prev) =>
                prev.map((draft) =>
                  draft.id === item.id
                    ? {
                        ...draft,
                        progressPercent,
                        speedMbps,
                      }
                    : draft
                )
              )
            }
          )

          successCount += 1
          setUploadDrafts((prev) =>
            prev.map((draft) =>
              draft.id === item.id
                ? {
                    ...draft,
                    status: "uploaded",
                    progressPercent: 100,
                    error: undefined,
                  }
                : draft
            )
          )
        } catch (error) {
          const message = getErrorMessage(error, text.errorGeneric)
          setUploadDrafts((prev) =>
            prev.map((draft) =>
              draft.id === item.id
                ? {
                    ...draft,
                    status: "failed",
                    error: message,
                  }
                : draft
            )
          )
        }

      }

      if (successCount > 0) {
        toast.success(text.successFilesUploaded(successCount))
        await connectAndLoad(currentPrefix, { silentSuccess: true })
      }

      if (successCount !== queue.length) {
        toast.error(text.uploadSomeFailed(successCount, queue.length))
        return
      }

      setUploadDrafts([])
      setIsUploadModalOpen(false)
    } finally {
      setBusyMessage(null)
    }
  }

  async function handleCreateFolder(): Promise<void> {
    if (!connection) {
      return
    }

    setBusyMessage(text.busyCreatingFolder)

    try {
      await createFolder(connection.client, connection.parsed.bucket, currentPrefix, newFolderName)
      toast.success(text.successFolderCreated)
      setNewFolderName("")
      setIsCreateFolderOpen(false)
      await connectAndLoad(currentPrefix, { silentSuccess: true })
    } catch (error) {
      toast.error(getErrorMessage(error, text.errorGeneric))
    } finally {
      setBusyMessage(null)
    }
  }

  async function openTextEditor(node: SpaceNode): Promise<void> {
    if (!connection) {
      return
    }

    setEditorLoading(true)
    setEditorTarget(node)
    setEditorContent("")

    try {
      const content = await readTextFile(connection.client, connection.parsed.bucket, node.key)
      setEditorContent(content)
    } catch (error) {
      toast.error(getErrorMessage(error, text.errorGeneric))
      setEditorTarget(null)
    } finally {
      setEditorLoading(false)
    }
  }

  async function saveTextEditor(visibility: ObjectVisibility): Promise<void> {
    if (!connection || !editorTarget) {
      return
    }

    setBusyMessage(text.busySavingText)

    try {
      await writeTextFile(
        connection.client,
        connection.parsed.bucket,
        editorTarget.key,
        editorContent,
        visibility
      )
      toast.success(text.successTextSaved)
      setIsSaveVisibilityOpen(false)
      setEditorTarget(null)
      await connectAndLoad(currentPrefix, { silentSuccess: true })
    } catch (error) {
      toast.error(getErrorMessage(error, text.errorGeneric))
    } finally {
      setBusyMessage(null)
    }
  }

  async function copyPublicLink(node: SpaceNode): Promise<void> {
    if (!connection) {
      return
    }

    try {
      const url = toPublicObjectUrl(connection.parsed.publicBaseUrl, node.key)
      await navigator.clipboard.writeText(url)
      toast.success(text.successLinkCopied)
    } catch {
      toast.error(text.errorLinkCopy)
    }
  }

  async function handleDeleteConfirmed(): Promise<void> {
    if (!connection || deleteTargets.length === 0) {
      return
    }

    setBusyMessage(text.busyDeleting)

    try {
      for (const target of deleteTargets) {
        if (target.type === "folder") {
          await deleteFolder(connection.client, connection.parsed.bucket, target.key)
        } else {
          await deleteFile(connection.client, connection.parsed.bucket, target.key)
        }
      }

      toast.success(text.successDeleted(deleteTargets.length))
      setDeleteTargets([])
      setSelectedKeys([])
      await connectAndLoad(currentPrefix, { silentSuccess: true })
    } catch (error) {
      toast.error(getErrorMessage(error, text.errorGeneric))
    } finally {
      setBusyMessage(null)
    }
  }

  async function handleRename(): Promise<void> {
    if (!connection || !renameTarget) {
      return
    }

    const nextKey = buildRenamedKey(currentPrefix, renameValue, renameTarget.type === "folder")
    if (!nextKey) {
      toast.error(text.errorRenameRequired)
      return
    }

    if (nextKey === renameTarget.key) {
      setRenameTarget(null)
      return
    }

    setBusyMessage(text.busyRenaming)

    try {
      if (renameTarget.type === "folder") {
        await renameFolder(connection.client, connection.parsed.bucket, renameTarget.key, nextKey)
      } else {
        await renameFile(connection.client, connection.parsed.bucket, renameTarget.key, nextKey)
      }

      toast.success(text.successRenamed)
      setRenameTarget(null)
      setRenameValue("")
      await connectAndLoad(currentPrefix, { silentSuccess: true })
    } catch (error) {
      toast.error(getErrorMessage(error, text.errorGeneric))
    } finally {
      setBusyMessage(null)
    }
  }

  function toggleSelection(key: string): void {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  function openRenameDialog(node: SpaceNode): void {
    setRenameTarget(node)
    setRenameValue(node.name)
  }

  const selectedNodes = nodes.filter((node) => selectedKeys.includes(node.key))
  const isAllSelected = nodes.length > 0 && selectedKeys.length === nodes.length

  if (appMode === "restoring") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_0%,#dff8ff_0%,#f4f6fb_35%,#f7f8fa_100%)] p-6">
        <Card className="w-full max-w-md border-white/70 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LoaderCircle className="size-5 animate-spin" />
              {text.restoringSession}
            </CardTitle>
            <CardDescription>{text.restoringHint}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (appMode === "signed-out") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#dff8ff_0%,#e8eef8_35%,#f7f8fa_100%)] p-4 sm:p-8">
        <div className="mx-auto grid min-h-[calc(100svh-2rem)] w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-8 text-white shadow-xl">
            <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold tracking-tight">{text.appName}</h1>
                <div className="flex items-center gap-2">
                  <Globe className="size-4" />
                  <select
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                    className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-xs"
                    aria-label={text.language}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
                  {text.productBy}
                </p>
                <h2 className="max-w-lg text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  {text.loginTitle}
                </h2>
                <p className="max-w-xl text-sm text-slate-200 sm:text-base">{text.loginSubtitle}</p>
              </div>

              <div className="grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
                <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                  <p className="font-medium">{text.featureArchitectureTitle}</p>
                  <p className="mt-1 text-xs text-slate-200">{text.featureArchitectureDesc}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                  <p className="font-medium">{text.featureOpenSourceTitle}</p>
                  <p className="mt-1 text-xs text-slate-200">{text.featureOpenSourceDesc}</p>
                </div>
              </div>
            </div>
          </section>

          <Card className="self-center border-white/60 bg-white/90 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{text.loginPanelTitle}</CardTitle>
              <CardDescription>{text.loginPanelDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">{text.providerLabel}</Label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as ProviderId)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                >
                  <option value="" disabled>
                    {text.providerPlaceholder}
                  </option>
                  {PROVIDERS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getProviderLabel(locale, item.id)}{item.enabled ? "" : ` (${text.providerSoon})`}
                    </option>
                  ))}
                </select>
                {!providerEnabled ? <p className="text-xs text-amber-600">{text.providerUnsupported}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bucket-url">{text.bucketUrlLabel}</Label>
                <Input
                  id="bucket-url"
                  placeholder={text.bucketUrlPlaceholder}
                  value={credentials.bucketUrl}
                  onChange={(event) => updateCredential("bucketUrl", event.target.value)}
                  disabled={!providerEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-key">{text.accessKeyLabel}</Label>
                <Input
                  id="access-key"
                  placeholder={text.accessKeyPlaceholder}
                  value={credentials.accessKeyId}
                  onChange={(event) => updateCredential("accessKeyId", event.target.value)}
                  disabled={!providerEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret-key">{text.secretKeyLabel}</Label>
                <Input
                  id="secret-key"
                  type="password"
                  placeholder={text.secretKeyPlaceholder}
                  value={credentials.secretAccessKey}
                  onChange={(event) => updateCredential("secretAccessKey", event.target.value)}
                  disabled={!providerEnabled}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(event) => setKeepSignedIn(event.target.checked)}
                />
                {text.keepSignedIn}
              </label>

              <Button
                className="w-full"
                disabled={!providerEnabled || !hasRequiredCredentials || isLoading}
                onClick={handleLogin}
              >
                {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {isLoading ? text.loginButtonLoading : text.loginButton}
              </Button>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">{text.loginSecurityNote}</p>
                <p className="mt-1">{text.loginSecurityHint}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#dff8ff_0%,#f4f6fb_35%,#f7f8fa_100%)] px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{text.appName}</h1>
              <p className="text-sm text-slate-600">{text.dashboardSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {parsedPreview ? <Badge variant="secondary">{text.statusBucket}: {parsedPreview.bucket}</Badge> : null}
              <Badge>{isAuthenticated ? text.statusConnected : text.statusReady}</Badge>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
                <Globe className="size-4 text-slate-600" />
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as Locale)}
                  className="bg-transparent text-xs outline-none"
                  aria-label={text.language}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" />
                {text.signOut}
              </Button>
            </div>
          </div>
        </header>

        <Card className="border-white/60 bg-white/85 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => connectAndLoad(currentPrefix, { silentSuccess: true })}
                  disabled={isLoading}
                >
                  <RefreshCw className="size-4" />
                  {text.refresh}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  disabled={busyMessage !== null}
                >
                  <Upload className="size-4" />
                  {text.uploadFiles}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateFolderOpen(true)}
                  disabled={busyMessage !== null}
                >
                  <FolderPlus className="size-4" />
                  {text.createFolder}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedNodes.length === 0 || busyMessage !== null}
                  onClick={() => setDeleteTargets(selectedNodes)}
                >
                  <Trash2 className="size-4" />
                  {text.deleteSelected(selectedNodes.length)}
                </Button>
              </div>

              <Separator />

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                  {breadcrumbs.map((item, index) => (
                    <div key={item.prefix || "root"} className="flex items-center gap-1">
                      <button
                        type="button"
                        className="shrink-0 rounded-md px-1.5 py-1 font-medium hover:bg-slate-200/70"
                        onClick={() => connectAndLoad(item.prefix, { silentSuccess: true })}
                      >
                        {item.label}
                      </button>
                      {index < breadcrumbs.length - 1 ? <ChevronRight className="size-3 text-slate-400" /> : null}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPrefix === ""}
                  onClick={() => connectAndLoad(getParentPrefix(currentPrefix), { silentSuccess: true })}
                >
                  <FolderUp className="size-4" />
                  {text.parentFolder}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[480px] rounded-lg border border-slate-200/80 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedKeys(nodes.map((node) => node.key))
                          } else {
                            setSelectedKeys([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>{text.tableName}</TableHead>
                    <TableHead>{text.tableType}</TableHead>
                    <TableHead>{text.tableSize}</TableHead>
                    <TableHead>{text.tableDate}</TableHead>
                    <TableHead>{text.tableVisibility}</TableHead>
                    <TableHead className="text-right">{text.tableAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                        {isAuthenticated ? text.emptyFolder : text.emptyBeforeConnect}
                      </TableCell>
                    </TableRow>
                  ) : (
                    nodes.map((node) => (
                      <TableRow key={node.key}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedKeys.includes(node.key)}
                            onChange={() => toggleSelection(node.key)}
                          />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium">
                          {node.type === "folder" ? (
                            <button
                              type="button"
                              className="text-left text-sky-700 hover:underline"
                              onClick={() => connectAndLoad(node.key, { silentSuccess: true })}
                            >
                              {node.name}
                            </button>
                          ) : (
                            node.name
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={node.type === "folder" ? "secondary" : "outline"}>
                            {node.type === "folder" ? text.typeFolder : text.typeFile}
                          </Badge>
                        </TableCell>
                        <TableCell>{node.type === "folder" ? "-" : formatBytes(node.size)}</TableCell>
                        <TableCell>{formatTimestamp(node.lastModified, locale)}</TableCell>
                        <TableCell>
                          {node.type === "folder" ? (
                            "-"
                          ) : (
                            <Badge variant={visibilityByKey[node.key] === "public" ? "default" : "outline"}>
                              {visibilityByKey[node.key] === "checking" ? (
                                <LoaderCircle className="size-3 animate-spin" />
                              ) : visibilityByKey[node.key] === "public" ? (
                                <>
                                  <Globe className="mr-1 size-3" />
                                  {getVisibilityLabel("public")}
                                </>
                              ) : visibilityByKey[node.key] === "private" ? (
                                <>
                                  <Lock className="mr-1 size-3" />
                                  {getVisibilityLabel("private")}
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-1 size-3" />
                                  {getVisibilityLabel("unknown")}
                                </>
                              )}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => copyPublicLink(node)}
                              title={text.copyLink}
                            >
                              <Link2 className="size-4" />
                            </Button>

                            {node.type === "file" && node.name.toLowerCase().endsWith(".txt") ? (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => openTextEditor(node)}
                                title={text.editText}
                              >
                                <FilePenLine className="size-4" />
                              </Button>
                            ) : null}

                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => openRenameDialog(node)}
                              title={text.rename}
                            >
                              <Pencil className="size-4" />
                            </Button>

                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setDeleteTargets([node])}
                              title={text.delete}
                            >
                              <Trash2 className="size-4 text-rose-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <footer className="rounded-xl border border-white/60 bg-white/75 px-4 py-3 text-center text-sm text-slate-600 backdrop-blur-sm">
          <span>{locale === "tr" ? "Gelistiren:" : "Built by:"} </span>
          <a
            href="https://webisso.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            WebissoLLC
          </a>
          <span>{` | ver: ${import.meta.env.VITE_APP_VERSION ?? "dev"}`}</span>
        </footer>
      </div>

      <Dialog
        open={isUploadModalOpen}
        onOpenChange={(open) => {
          setIsUploadModalOpen(open)
          if (!open) {
            setUploadDrafts([])
            setUploadMode("batch")
            setBulkUploadVisibility("private")
          }
        }}
      >
        <DialogContent className="top-[10px] left-[10px] right-[10px] bottom-[10px] h-auto w-auto max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-2xl p-0 sm:max-w-none">
          <div className="flex h-full flex-col">
            <div className="border-b bg-gradient-to-r from-cyan-50 via-sky-50 to-white px-5 py-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Upload className="size-5 text-sky-600" />
                  {text.uploadModalTitle}
                </DialogTitle>
                <DialogDescription>{text.uploadModalDesc}</DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[330px_1fr]">
              <aside className="space-y-4 border-r bg-slate-50/70 p-4">
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {text.uploadQueueCount(uploadDrafts.length)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => uploadPickerRef.current?.click()}>
                      <Upload className="size-4" />
                      {uploadDrafts.length === 0 ? text.uploadChooseFiles : text.uploadAddMore}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploadDrafts.length === 0}
                      onClick={() => setUploadDrafts([])}
                    >
                      {text.uploadClearQueue}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {text.uploadModeLabel}
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={uploadMode === "batch" ? "default" : "outline"}
                      onClick={() => setUploadMode("batch")}
                    >
                      {text.uploadModeBatch}
                    </Button>
                    <Button
                      size="sm"
                      variant={uploadMode === "per-file" ? "default" : "outline"}
                      onClick={() => setUploadMode("per-file")}
                    >
                      {text.uploadModePerFile}
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="bulk-upload-visibility">{text.uploadBulkVisibilityLabel}</Label>
                    <select
                      id="bulk-upload-visibility"
                      value={bulkUploadVisibility}
                      onChange={(event) => setBulkUploadVisibility(event.target.value as ObjectVisibility)}
                      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    >
                      <option value="private">{text.visibilityPrivate}</option>
                      <option value="public">{text.visibilityPublic}</option>
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={uploadDrafts.length === 0}
                      onClick={applyBulkVisibilityToQueuedFiles}
                    >
                      {text.uploadApplyBulkVisibility}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="flex items-start gap-2">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {text.uploadDestinationLabel}: <strong>{`/${currentPrefix || ""}`}</strong>
                    </span>
                  </p>
                </div>
              </aside>

              <div className="min-h-0 p-4">
                {uploadDrafts.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                    {text.uploadListEmpty}
                  </div>
                ) : (
                  <ScrollArea className="h-full rounded-xl border bg-white">
                    <Table className="min-w-[980px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{text.uploadFileName}</TableHead>
                          <TableHead>{text.uploadFileType}</TableHead>
                          <TableHead>{text.tableSize}</TableHead>
                          <TableHead>{text.uploadFileDestination}</TableHead>
                          <TableHead>{text.uploadFileVisibility}</TableHead>
                          <TableHead>{text.uploadFileStatus}</TableHead>
                          <TableHead className="text-right">{text.uploadFileAction}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadDrafts.map((item) => {
                          const effectiveVisibility =
                            uploadMode === "batch" ? bulkUploadVisibility : item.visibility

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="max-w-[220px] truncate font-medium">{item.file.name}</TableCell>
                              <TableCell>{item.file.type || "application/octet-stream"}</TableCell>
                              <TableCell>{formatBytes(item.file.size)}</TableCell>
                              <TableCell className="max-w-[260px] truncate text-xs text-slate-600">
                                {buildUploadDestination(currentPrefix, item.file.name)}
                              </TableCell>
                              <TableCell>
                                {uploadMode === "per-file" ? (
                                  <select
                                    value={item.visibility}
                                    onChange={(event) => {
                                      const nextVisibility = event.target.value as ObjectVisibility
                                      setUploadDrafts((prev) =>
                                        prev.map((draft) =>
                                          draft.id === item.id
                                            ? {
                                                ...draft,
                                                visibility: nextVisibility,
                                              }
                                            : draft
                                        )
                                      )
                                    }}
                                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                                  >
                                    <option value="private">{text.visibilityPrivate}</option>
                                    <option value="public">{text.visibilityPublic}</option>
                                  </select>
                                ) : (
                                  <Badge variant={effectiveVisibility === "public" ? "default" : "outline"}>
                                    {effectiveVisibility === "public" ? (
                                      <Globe className="mr-1 size-3" />
                                    ) : (
                                      <Lock className="mr-1 size-3" />
                                    )}
                                    {getVisibilityLabel(effectiveVisibility)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.status === "uploaded"
                                      ? "default"
                                      : item.status === "failed"
                                        ? "destructive"
                                        : item.status === "uploading"
                                          ? "secondary"
                                          : "outline"
                                  }
                                >
                                  {getUploadStatusLabel(item.status)}
                                </Badge>
                                {item.error ? <p className="mt-1 text-xs text-rose-600">{item.error}</p> : null}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.status === "uploading" ? (
                                  <div className="ml-auto w-44 space-y-1.5 text-left">
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className="h-full rounded-full bg-sky-500 transition-[width] duration-150"
                                        style={{ width: `${item.progressPercent.toFixed(1)}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-slate-600">
                                      {item.progressPercent.toFixed(1)}% • {item.speedMbps.toFixed(2)} MB/s
                                    </p>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={busyMessage !== null}
                                    onClick={() =>
                                      setUploadDrafts((prev) => prev.filter((draft) => draft.id !== item.id))
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                    {text.uploadRemoveFile}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t bg-white px-4 py-2.5">
              <div className="flex items-center justify-end gap-2">
              <input
                ref={uploadPickerRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleUploadPickerChange}
              />
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                {text.close}
              </Button>
              <Button
                disabled={uploadDrafts.length === 0 || busyMessage !== null}
                onClick={handleUploadFromQueue}
              >
                <Upload className="size-4" />
                {text.uploadStart}
              </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.createFolderTitle}</DialogTitle>
            <DialogDescription>{text.createFolderDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-folder">{text.folderName}</Label>
            <Input
              id="new-folder"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder={text.folderNamePlaceholder}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              {text.cancel}
            </Button>
            <Button onClick={handleCreateFolder}>{text.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameTarget !== null} onOpenChange={(open) => (!open ? setRenameTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.renameTitle}</DialogTitle>
            <DialogDescription>{renameTarget ? text.renameDesc(renameTarget.name) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input">{text.newName}</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              {text.cancel}
            </Button>
            <Button onClick={handleRename}>{text.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorTarget !== null} onOpenChange={(open) => (!open ? setEditorTarget(null) : undefined)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{text.textEditorTitle}</DialogTitle>
            <DialogDescription>{editorTarget?.key}</DialogDescription>
          </DialogHeader>

          {editorLoading ? (
            <div className="flex h-52 items-center justify-center text-slate-500">
              <LoaderCircle className="size-4 animate-spin" />
              <span className="ml-2">{text.loadingFile}...</span>
            </div>
          ) : (
            <Textarea
              value={editorContent}
              onChange={(event) => setEditorContent(event.target.value)}
              className="min-h-[340px] font-mono text-xs"
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorTarget(null)}>
              {text.close}
            </Button>
            <Button disabled={editorLoading} onClick={() => setIsSaveVisibilityOpen(true)}>
              <FilePenLine className="size-4" />
              {text.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveVisibilityOpen} onOpenChange={setIsSaveVisibilityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.saveVisibilityTitle}</DialogTitle>
            <DialogDescription>{text.saveVisibilityDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <button
              type="button"
              className={`w-full rounded-lg border p-3 text-left ${
                pendingSaveVisibility === "public" ? "border-sky-400 bg-sky-50" : "border-slate-200"
              }`}
              onClick={() => setPendingSaveVisibility("public")}
            >
              <p className="font-medium text-slate-900">{text.saveVisibilityPublic}</p>
              <p className="text-sm text-slate-600">{text.saveVisibilityPublicDesc}</p>
            </button>

            <button
              type="button"
              className={`w-full rounded-lg border p-3 text-left ${
                pendingSaveVisibility === "private" ? "border-slate-400 bg-slate-50" : "border-slate-200"
              }`}
              onClick={() => setPendingSaveVisibility("private")}
            >
              <p className="font-medium text-slate-900">{text.saveVisibilityPrivate}</p>
              <p className="text-sm text-slate-600">{text.saveVisibilityPrivateDesc}</p>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveVisibilityOpen(false)}>
              {text.cancel}
            </Button>
            <Button onClick={() => saveTextEditor(pendingSaveVisibility)}>
              <FilePenLine className="size-4" />
              {text.saveAs}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargets.length > 0} onOpenChange={(open) => (!open ? setDeleteTargets([]) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-500" />
              {text.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{text.deleteConfirmDesc(deleteTargets.length)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed}>
              <Trash2 className="size-4" />
              {text.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {busyMessage ? (
        <div className="fixed right-4 bottom-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
          <div className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin text-slate-600" />
            {busyMessage}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
