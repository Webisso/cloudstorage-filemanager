import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Copy,
  FilePenLine,
  FolderPlus,
  Globe,
  LoaderCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  listNodes,
  parseSpacesBucketUrl,
  readTextFile,
  renameFile,
  renameFolder,
  type SpaceNode,
  type SpacesCredentials,
  toPublicObjectUrl,
  uploadFiles,
  writeTextFile,
} from "@/lib/spaces"

type Locale = "tr" | "en"
type ProviderId = "digitalocean_spaces" | "amazon_s3" | "cloudflare_r2"
type AppMode = "signed-out" | "restoring" | "ready"

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
  tableAction: string
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
  textEditorTitle: string
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
    appName: "WebissoLLC Storage Console",
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
    tableAction: "İşlem",
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
    textEditorTitle: "Metin düzenleyici",
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
    appName: "WebissoLLC Storage Console",
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
    tableAction: "Action",
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
    textEditorTitle: "Text editor",
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

  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""

    if (files.length === 0 || !connection) {
      return
    }

    setBusyMessage(text.busyUploadingFiles)
    setUploadProgress({ done: 0, total: files.length })

    try {
      for (let index = 0; index < files.length; index += 1) {
        await uploadFiles(connection.client, connection.parsed.bucket, currentPrefix, [files[index]])
        setUploadProgress({ done: index + 1, total: files.length })
      }

      toast.success(text.successFilesUploaded(files.length))
      await connectAndLoad(currentPrefix, { silentSuccess: true })
    } catch (error) {
      toast.error(getErrorMessage(error, text.errorGeneric))
    } finally {
      setBusyMessage(null)
      setUploadProgress(null)
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

  async function saveTextEditor(): Promise<void> {
    if (!connection || !editorTarget) {
      return
    }

    setBusyMessage(text.busySavingText)

    try {
      await writeTextFile(connection.client, connection.parsed.bucket, editorTarget.key, editorContent)
      toast.success(text.successTextSaved)
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
              <Badge variant="outline">{text.statusProvider}: {getProviderLabel(locale, provider)}</Badge>
              {parsedPreview ? <Badge variant="secondary">{text.statusBucket}: {parsedPreview.bucket}</Badge> : null}
              {parsedPreview ? <Badge variant="outline">{text.statusRegion}: {parsedPreview.region}</Badge> : null}
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
                  onClick={() => fileInputRef.current?.click()}
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

              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                {breadcrumbs.map((item, index) => (
                  <button
                    key={item.prefix || "root"}
                    type="button"
                    className="rounded-md px-1.5 py-1 hover:bg-slate-200/70"
                    onClick={() => connectAndLoad(item.prefix, { silentSuccess: true })}
                  >
                    {item.label}
                    {index < breadcrumbs.length - 1 ? " /" : ""}
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPrefix === ""}
                  onClick={() => connectAndLoad(getParentPrefix(currentPrefix), { silentSuccess: true })}
                >
                  {text.parentFolder}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="files" className="w-full">
              <TabsList>
                <TabsTrigger value="files">{text.tabFiles}</TabsTrigger>
                <TabsTrigger value="about">{text.tabAbout}</TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="pt-3">
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
                        <TableHead className="text-right">{text.tableAction}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nodes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
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
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => copyPublicLink(node)}
                                  title={text.copyLink}
                                >
                                  <Copy className="size-4" />
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
              </TabsContent>

              <TabsContent value="about" className="space-y-3 pt-3 text-sm text-slate-700">
                <p>{text.operationsSummary}</p>
                <p>
                  {text.activeFolder}: <span className="font-medium">/{currentPrefix || ""}</span>
                </p>
                {uploadProgress ? <p>{text.uploadProgress(uploadProgress.done, uploadProgress.total)}</p> : null}
              </TabsContent>
            </Tabs>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </CardContent>
        </Card>

        <footer className="rounded-xl border border-white/60 bg-white/75 px-4 py-3 text-center text-sm text-slate-600 backdrop-blur-sm">
          {text.productBy}
        </footer>
      </div>

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
            <Button disabled={editorLoading} onClick={saveTextEditor}>
              <FilePenLine className="size-4" />
              {text.save}
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
