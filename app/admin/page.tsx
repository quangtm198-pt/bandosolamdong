"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  LogOut,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const BUCKET = "place-images";
const PAGE_SIZE = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const STORY_CATEGORIES = [
  { value: "history", label: "Lịch sử" },
  { value: "culture", label: "Văn hóa" },
  { value: "people", label: "Con người & đời sống" },
  { value: "cuisine", label: "Ẩm thực" },
  { value: "other", label: "Câu chuyện khác" },
] as const;

type StoryCategory = (typeof STORY_CATEGORIES)[number]["value"];
type Tab = "overview" | "places" | "stories" | "types";

type PlaceType = {
  id: string;
  name: string;
};

type Ward = {
  id: string;
  name: string;
  province_code: string | null;
};

type Place = {
  id: string;
  name: string;
  slug: string | null;
  place_type_id: string | null;
  ward_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  short_description: string | null;
  description: string | null;
  cover_image: string | null;
  vr360_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  historical_period: string | null;
  recognition: string | null;
  source: string | null;
  sort_order: number | null;
  is_published: boolean;
};

type Story = {
  id: number;
  ward_id: string;
  category: StoryCategory;
  title: string;
  slug: string | null;
  summary: string | null;
  content: string | null;
  cover_image: string | null;
  audio_url: string | null;
  video_url: string | null;
  vr360_url: string | null;
  source: string | null;
  sort_order: number | null;
  is_published: boolean;
  published_at: string | null;
};

type PlaceForm = {
  name: string;
  slug: string;
  place_type_id: string;
  ward_id: string;
  address: string;
  latitude: string;
  longitude: string;
  short_description: string;
  description: string;
  cover_image: string;
  vr360_url: string;
  audio_url: string;
  video_url: string;
  historical_period: string;
  recognition: string;
  source: string;
  sort_order: string;
};

type StoryForm = {
  title: string;
  slug: string;
  ward_id: string;
  category: StoryCategory;
  summary: string;
  content: string;
  cover_image: string;
  vr360_url: string;
  audio_url: string;
  video_url: string;
  source: string;
  sort_order: string;
};

const EMPTY_PLACE: PlaceForm = {
  name: "",
  slug: "",
  place_type_id: "",
  ward_id: "",
  address: "",
  latitude: "",
  longitude: "",
  short_description: "",
  description: "",
  cover_image: "",
  vr360_url: "",
  audio_url: "",
  video_url: "",
  historical_period: "",
  recognition: "",
  source: "",
  sort_order: "",
};

const EMPTY_STORY: StoryForm = {
  title: "",
  slug: "",
  ward_id: "",
  category: "history",
  summary: "",
  content: "",
  cover_image: "",
  vr360_url: "",
  audio_url: "",
  video_url: "",
  source: "",
  sort_order: "",
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

const primaryButton =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .trim();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ".jpg";
  const base = dot >= 0 ? name.slice(0, dot) : name;

  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "image";

  return `${clean}${/^\.(jpg|jpeg|png|webp)$/.test(ext) ? ext : ".jpg"}`;
}

function storagePath(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);

    return index < 0
      ? null
      : decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function categoryLabel(category: string) {
  return (
    STORY_CATEGORIES.find((item) => item.value === category)?.label ??
    "Câu chuyện khác"
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>

      <textarea
        value={value}
        rows={rows}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} h-auto resize-y`}
      />
    </label>
  );
}

function WardPicker({
  wards,
  value,
  onChange,
}: {
  wards: Ward[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(wards.find((ward) => ward.id === value)?.name ?? "");
  }, [value, wards]);

  const filtered = useMemo(() => {
    const keyword = normalizeText(query);

    return wards.filter(
      (ward) =>
        !keyword || normalizeText(ward.name).includes(keyword),
    );
  }, [wards, query]);

  return (
    <div className="relative">
      <span className={labelClass}>Xã/phường/đặc khu</span>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />

        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);

            if (e.key === "Enter" && filtered.length === 1) {
              e.preventDefault();
              onChange(filtered[0].id);
              setQuery(filtered[0].name);
              setOpen(false);
            }
          }}
          placeholder="Gõ tên địa bàn để tìm..."
          className={`${inputClass} pl-9`}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />

        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Đóng danh sách địa bàn"
              onClick={() => setOpen(false)}
            />

            <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-1.5 shadow-xl">
              <p className="px-2 py-1.5 text-[10px] text-slate-500">
                {filtered.length} địa bàn phù hợp
              </p>

              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
              >
                Bỏ chọn địa bàn
              </button>

              {filtered.map((ward) => (
                <button
                  type="button"
                  key={ward.id}
                  onClick={() => {
                    onChange(ward.id);
                    setQuery(ward.name);
                    setOpen(false);
                  }}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs hover:bg-emerald-50 ${
                    value === ward.id
                      ? "bg-emerald-50 font-semibold text-emerald-800"
                      : "text-slate-700"
                  }`}
                >
                  {ward.name}
                  {value === ward.id ? " ✓" : ""}
                </button>
              ))}

              {!filtered.length && (
                <p className="px-3 py-5 text-center text-xs text-slate-500">
                  Không tìm thấy địa bàn.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  icon: typeof MapPin;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">{note}</p>
        </div>

        <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [storyLoadError, setStoryLoadError] = useState("");

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [storyCategoryFilter, setStoryCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [placeForm, setPlaceForm] = useState<PlaceForm>(EMPTY_PLACE);
  const [storyForm, setStoryForm] = useState<StoryForm>(EMPTY_STORY);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeNameInput, setTypeNameInput] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [placeResult, typeResult, wardResult, storyResult] =
        await Promise.all([
          supabase
            .from("places")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("id", { ascending: false }),

          supabase
            .from("place_types")
            .select("id,name")
            .order("name"),

          supabase
            .from("wards")
            .select("id,name,province_code")
            .eq("province_code", "68")
            .order("name"),

          supabase
            .from("ward_stories")
            .select("*")
            .order("sort_order", { ascending: true })
            .order("id", { ascending: false }),
        ]);

      if (placeResult.error) throw placeResult.error;
      if (typeResult.error) throw typeResult.error;
      if (wardResult.error) throw wardResult.error;

      setPlaces((placeResult.data ?? []) as Place[]);
      setPlaceTypes((typeResult.data ?? []) as PlaceType[]);
      setWards((wardResult.data ?? []) as Ward[]);

      if (storyResult.error) {
        setStories([]);
        setStoryLoadError(
          `Không tải được bảng ward_stories: ${storyResult.error.message}`,
        );
      } else {
        setStories((storyResult.data ?? []) as Story[]);
        setStoryLoadError("");
      }
    } catch (error) {
      alert(`Không tải được dữ liệu quản trị: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/admin/login");
          return;
        }

        const { data, error } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error || !data) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
          return;
        }

        if (active) setAuthorized(true);
      } catch {
        router.replace("/admin/login");
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (authorized) void loadData();
  }, [authorized, loadData]);

  useEffect(() => {
    if (!imageFile) return;

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const filteredPlaces = useMemo(() => {
    const keyword = normalizeText(search);

    return places.filter(
      (place) =>
        (!keyword ||
          [
            place.name,
            place.slug,
            place.address,
            place.short_description,
          ]
            .filter(Boolean)
            .some((value) =>
              normalizeText(String(value)).includes(keyword),
            )) &&
        (!typeFilter || place.place_type_id === typeFilter) &&
        (!wardFilter || place.ward_id === wardFilter),
    );
  }, [places, search, typeFilter, wardFilter]);

  const filteredStories = useMemo(() => {
    const keyword = normalizeText(search);

    return stories.filter(
      (story) =>
        (!keyword ||
          [
            story.title,
            story.slug,
            story.summary,
            story.content,
          ]
            .filter(Boolean)
            .some((value) =>
              normalizeText(String(value)).includes(keyword),
            )) &&
        (!wardFilter || story.ward_id === wardFilter) &&
        (!storyCategoryFilter ||
          story.category === storyCategoryFilter),
    );
  }, [stories, search, wardFilter, storyCategoryFilter]);

  const activeRowsCount =
    tab === "stories" ? filteredStories.length : filteredPlaces.length;

  const totalPages = Math.max(
    1,
    Math.ceil(activeRowsCount / PAGE_SIZE),
  );

  const visiblePlaces = filteredPlaces.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const visibleStories = filteredStories.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, wardFilter, storyCategoryFilter, tab]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const typeName = (id: string | null) =>
    placeTypes.find((type) => type.id === id)?.name ??
    "Chưa phân loại";

  const wardName = (id: string | null) =>
    wards.find((ward) => ward.id === id)?.name ??
    "Chưa chọn địa bàn";

  const updatePlace = (key: keyof PlaceForm, value: string) =>
    setPlaceForm((old) => ({ ...old, [key]: value }));

  const updateStory = (key: keyof StoryForm, value: string) =>
    setStoryForm((old) => ({ ...old, [key]: value }));

  function resetImage(image = "") {
    setImageFile(null);
    setImagePreview(image);
    setRemoveImage(false);
  }

  function openCreatePlace() {
    setEditingPlaceId(null);
    setPlaceForm(EMPTY_PLACE);
    resetImage();
    setPlaceModalOpen(true);
  }

  function openEditPlace(place: Place) {
    setEditingPlaceId(place.id);

    setPlaceForm({
      name: place.name ?? "",
      slug: place.slug ?? "",
      place_type_id: place.place_type_id ?? "",
      ward_id: place.ward_id ?? "",
      address: place.address ?? "",
      latitude: place.latitude?.toString() ?? "",
      longitude: place.longitude?.toString() ?? "",
      short_description: place.short_description ?? "",
      description: place.description ?? "",
      cover_image: place.cover_image ?? "",
      vr360_url: place.vr360_url ?? "",
      audio_url: place.audio_url ?? "",
      video_url: place.video_url ?? "",
      historical_period: place.historical_period ?? "",
      recognition: place.recognition ?? "",
      source: place.source ?? "",
      sort_order: String(place.sort_order ?? 0),
    });

    resetImage(place.cover_image ?? "");
    setPlaceModalOpen(true);
  }

  function openCreateStory() {
    setEditingStoryId(null);
    setStoryForm(EMPTY_STORY);
    resetImage();
    setStoryModalOpen(true);
  }

  function openEditStory(story: Story) {
    setEditingStoryId(story.id);

    setStoryForm({
      title: story.title ?? "",
      slug: story.slug ?? "",
      ward_id: story.ward_id ?? "",
      category: story.category ?? "history",
      summary: story.summary ?? "",
      content: story.content ?? "",
      cover_image: story.cover_image ?? "",
      vr360_url: story.vr360_url ?? "",
      audio_url: story.audio_url ?? "",
      video_url: story.video_url ?? "",
      source: story.source ?? "",
      sort_order: String(story.sort_order ?? 0),
    });

    resetImage(story.cover_image ?? "");
    setStoryModalOpen(true);
  }

  function closePlaceModal() {
    if (saving || uploadingImage) return;
    setPlaceModalOpen(false);
    resetImage();
  }

  function closeStoryModal() {
    if (saving || uploadingImage) return;
    setStoryModalOpen(false);
    resetImage();
  }

  function handleImageChange(file?: File) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Vui lòng chọn ảnh JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert("Ảnh vượt quá 5 MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
  }

  async function uploadImage(
    file: File,
    id: string | number,
    folder: "places" | "stories",
  ) {
    const path = `${folder}/${id}/${Date.now()}-${safeFileName(file.name)}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function deleteStoredImage(
    url: string | null | undefined,
  ) {
    const path = storagePath(url);
    if (!path) return;

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      console.error("Không xóa được ảnh trong Storage:", error.message);
    }
  }

  function validateUrls(items: Array<[string, string]>) {
    for (const [label, value] of items) {
      if (!value.trim()) continue;

      try {
        const parsed = new URL(value.trim());

        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error();
        }
      } catch {
        alert(`${label}: vui lòng nhập URL http/https hợp lệ.`);
        return false;
      }
    }

    return true;
  }

  async function savePlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!placeForm.name.trim()) {
      alert("Vui lòng nhập tên địa danh.");
      return;
    }

    if (!placeForm.ward_id) {
      alert("Vui lòng chọn xã/phường/đặc khu.");
      return;
    }

    const latitude = placeForm.latitude.trim()
      ? Number(placeForm.latitude)
      : null;

    const longitude = placeForm.longitude.trim()
      ? Number(placeForm.longitude)
      : null;

    if (
      latitude !== null &&
      (!Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90)
    ) {
      alert("Vĩ độ phải là số từ -90 đến 90.");
      return;
    }

    if (
      longitude !== null &&
      (!Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180)
    ) {
      alert("Kinh độ phải là số từ -180 đến 180.");
      return;
    }

    if (
      placeForm.sort_order.trim() &&
      !Number.isFinite(Number(placeForm.sort_order))
    ) {
      alert("Thứ tự hiển thị không hợp lệ.");
      return;
    }

    if (
      !validateUrls([
        ["Ảnh đại diện", placeForm.cover_image],
        ["VR360", placeForm.vr360_url],
        ["Âm thanh", placeForm.audio_url],
        ["Video", placeForm.video_url],
      ])
    ) {
      return;
    }

    setSaving(true);

    let uploadedUrl: string | null = null;
    let databaseSaved = false;

    try {
      const old = editingPlaceId
        ? places.find((place) => place.id === editingPlaceId)
        : undefined;

      let coverImage = removeImage
        ? null
        : placeForm.cover_image.trim() || null;

      if (imageFile) {
        setUploadingImage(true);

        uploadedUrl = await uploadImage(
          imageFile,
          editingPlaceId ?? crypto.randomUUID(),
          "places",
        );

        coverImage = uploadedUrl;
      }

      const maxOrder =
        places.reduce(
          (max, place) => Math.max(max, place.sort_order ?? 0),
          0,
        ) + 1;

      const payload = {
        name: placeForm.name.trim(),
        slug:
          placeForm.slug.trim() ||
          slugify(placeForm.name) ||
          null,
        place_type_id: placeForm.place_type_id || null,
        ward_id: placeForm.ward_id,
        address: placeForm.address.trim() || null,
        latitude,
        longitude,
        short_description:
          placeForm.short_description.trim() || null,
        description: placeForm.description.trim() || null,
        cover_image: coverImage,
        vr360_url: placeForm.vr360_url.trim() || null,
        audio_url: placeForm.audio_url.trim() || null,
        video_url: placeForm.video_url.trim() || null,
        historical_period:
          placeForm.historical_period.trim() || null,
        recognition: placeForm.recognition.trim() || null,
        source: placeForm.source.trim() || null,
        sort_order: placeForm.sort_order.trim()
          ? Number(placeForm.sort_order)
          : maxOrder,

        // Lưu địa danh là hiển thị công khai.
        is_published: true,
      };

      if (editingPlaceId) {
        const { data, error } = await supabase
          .from("places")
          .update(payload)
          .eq("id", editingPlaceId)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "Không cập nhật được địa danh. Kiểm tra ID và quyền RLS.",
          );
        }
      } else {
        const { data, error } = await supabase
          .from("places")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        if (!data) throw new Error("Không nhận được kết quả sau khi thêm địa danh.");
      }

      databaseSaved = true;

      if (old?.cover_image && old.cover_image !== coverImage) {
        await deleteStoredImage(old.cover_image);
      }

      setPlaceModalOpen(false);
      resetImage();
      await loadData();

      alert(
        editingPlaceId
          ? "Đã cập nhật địa danh."
          : "Đã thêm địa danh.",
      );
    } catch (error) {
      if (uploadedUrl && !databaseSaved) {
        await deleteStoredImage(uploadedUrl);
      }

      alert(`Không lưu được địa danh: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  async function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!storyForm.title.trim()) {
      alert("Vui lòng nhập tiêu đề câu chuyện.");
      return;
    }

    if (!storyForm.ward_id) {
      alert("Vui lòng chọn xã/phường/đặc khu.");
      return;
    }

    if (
      storyForm.sort_order.trim() &&
      !Number.isFinite(Number(storyForm.sort_order))
    ) {
      alert("Thứ tự hiển thị không hợp lệ.");
      return;
    }

    if (
      !validateUrls([
        ["Ảnh đại diện", storyForm.cover_image],
        ["VR360", storyForm.vr360_url],
        ["Âm thanh", storyForm.audio_url],
        ["Video", storyForm.video_url],
      ])
    ) {
      return;
    }

    setSaving(true);

    let uploadedUrl: string | null = null;
    let databaseSaved = false;

    try {
      const old =
        editingStoryId !== null
          ? stories.find((story) => story.id === editingStoryId)
          : undefined;

      let coverImage = removeImage
        ? null
        : storyForm.cover_image.trim() || null;

      if (imageFile) {
        setUploadingImage(true);

        uploadedUrl = await uploadImage(
          imageFile,
          editingStoryId ?? crypto.randomUUID(),
          "stories",
        );

        coverImage = uploadedUrl;
      }

      const maxOrder =
        stories.reduce(
          (max, story) => Math.max(max, story.sort_order ?? 0),
          0,
        ) + 1;

      const payload = {
        title: storyForm.title.trim(),
        slug:
          storyForm.slug.trim() ||
          slugify(storyForm.title),
        ward_id: storyForm.ward_id,
        category: storyForm.category,
        summary: storyForm.summary.trim() || null,
        content: storyForm.content.trim() || null,
        cover_image: coverImage,
        vr360_url: storyForm.vr360_url.trim() || null,
        audio_url: storyForm.audio_url.trim() || null,
        video_url: storyForm.video_url.trim() || null,
        source: storyForm.source.trim() || null,
        sort_order: storyForm.sort_order.trim()
          ? Number(storyForm.sort_order)
          : maxOrder,

        // Câu chuyện được lưu và hiển thị công khai.
        is_published: true,
        published_at:
          old?.published_at ?? new Date().toISOString(),
      };

      if (editingStoryId !== null) {
        const { data, error } = await supabase
          .from("ward_stories")
          .update(payload)
          .eq("id", editingStoryId)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "Không cập nhật được câu chuyện. Kiểm tra ID và quyền RLS.",
          );
        }
      } else {
        const { data, error } = await supabase
          .from("ward_stories")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        if (!data) throw new Error("Không nhận được kết quả sau khi thêm câu chuyện.");
      }

      databaseSaved = true;

      if (old?.cover_image && old.cover_image !== coverImage) {
        await deleteStoredImage(old.cover_image);
      }

      setStoryModalOpen(false);
      resetImage();
      await loadData();

      alert(
        editingStoryId !== null
          ? "Đã cập nhật câu chuyện."
          : "Đã thêm câu chuyện.",
      );
    } catch (error) {
      if (uploadedUrl && !databaseSaved) {
        await deleteStoredImage(uploadedUrl);
      }

      alert(`Không lưu được câu chuyện: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  async function deletePlace(place: Place) {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa địa danh “${place.name}” không? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("places")
        .delete()
        .eq("id", place.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Không xóa được địa danh. Hãy kiểm tra quyền truy cập.",
        );
      }

      await deleteStoredImage(place.cover_image);
      await loadData();

      alert("Đã xóa địa danh.");
    } catch (error) {
      alert(`Không xóa được địa danh: ${errorMessage(error)}`);
    }
  }

  async function deleteStory(story: Story) {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa câu chuyện “${story.title}” không? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("ward_stories")
        .delete()
        .eq("id", story.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Không xóa được câu chuyện. Hãy kiểm tra quyền truy cập.",
        );
      }

      await deleteStoredImage(story.cover_image);
      await loadData();

      alert("Đã xóa câu chuyện.");
    } catch (error) {
      alert(`Không xóa được câu chuyện: ${errorMessage(error)}`);
    }
  }

  function openCreateType() {
    setEditingTypeId(null);
    setTypeNameInput("");
    setTypeModalOpen(true);
  }

  function openEditType(type: PlaceType) {
    setEditingTypeId(type.id);
    setTypeNameInput(type.name);
    setTypeModalOpen(true);
  }

  async function saveType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = typeNameInput.trim();

    if (!name) {
      alert("Vui lòng nhập tên loại địa danh.");
      return;
    }

    if (
      placeTypes.some(
        (type) =>
          normalizeText(type.name) === normalizeText(name) &&
          type.id !== editingTypeId,
      )
    ) {
      alert("Tên loại địa danh này đã tồn tại.");
      return;
    }

    setSavingType(true);

    try {
      if (editingTypeId) {
        const { data, error } = await supabase
          .from("place_types")
          .update({ name })
          .eq("id", editingTypeId)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Không cập nhật được loại địa danh.");
      } else {
        const { error } = await supabase
          .from("place_types")
          .insert({ name });

        if (error) throw error;
      }

      setTypeModalOpen(false);
      await loadData();

      alert(
        editingTypeId
          ? "Đã cập nhật loại địa danh."
          : "Đã thêm loại địa danh.",
      );
    } catch (error) {
      alert(`Không lưu được loại địa danh: ${errorMessage(error)}`);
    } finally {
      setSavingType(false);
    }
  }

  async function deleteType(type: PlaceType) {
    const count = places.filter(
      (place) => place.place_type_id === type.id,
    ).length;

    if (count) {
      alert(
        `Không thể xóa loại “${type.name}” vì đang được sử dụng bởi ${count} địa danh.`,
      );
      return;
    }

    if (!window.confirm(`Xóa loại địa danh “${type.name}”?`)) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("place_types")
        .delete()
        .eq("id", type.id)
        .select("id");

      if (error) throw error;
      if (!data?.length) throw new Error("Không xóa được loại địa danh.");

      if (typeFilter === type.id) setTypeFilter("");

      await loadData();
    } catch (error) {
      alert(`Không xóa được loại địa danh: ${errorMessage(error)}`);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (checkingAuth || (authorized && loading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
          Đang tải dữ liệu quản trị...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  const navItems: Array<{
    id: Tab;
    label: string;
    icon: typeof MapPin;
    count?: number;
  }> = [
    { id: "overview", label: "Tổng quan", icon: Layers3 },
    { id: "places", label: "Địa danh", icon: MapPin, count: places.length },
    { id: "stories", label: "Câu chuyện", icon: BookOpen, count: stories.length },
    { id: "types", label: "Loại địa danh", icon: Tags, count: placeTypes.length },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <MapPinned className="h-5 w-5 text-emerald-100" />
            </div>

            <div className="min-w-0">
              <span className="rounded-full bg-emerald-300/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                CMS · ADMIN
              </span>

              <h1 className="mt-1 truncate text-base font-bold sm:text-lg">
                Quản trị bản đồ số
              </h1>

              <p className="mt-0.5 text-[11px] text-emerald-100/80">
                Lâm Đồng – Bản giao hưởng xanh
              </p>
            </div>
          </div>

          <button onClick={logout} className={secondaryButton}>
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Không gian quản trị nội dung
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {navItems.find((item) => item.id === tab)?.label}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Quản lý địa danh và câu chuyện từ dữ liệu Supabase.
            </p>
          </div>

          <button onClick={() => void loadData()} className={secondaryButton}>
            <RefreshCw className="h-4 w-4" />
            Làm mới dữ liệu
          </button>
        </div>

        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setSearch("");
                  setPage(1);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                  tab === item.id
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}

                {item.count !== undefined && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {tab === "overview" && (
          <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                title="Tổng địa danh"
                value={places.length}
                note="Dữ liệu trong Supabase"
                icon={MapPin}
              />
              <StatCard
                title="Câu chuyện"
                value={stories.length}
                note="Nội dung theo chủ đề"
                icon={BookOpen}
              />
              <StatCard
                title="Loại địa danh"
                value={placeTypes.length}
                note="Danh mục phân loại"
                icon={Tags}
              />
              <StatCard
                title="Địa bàn"
                value={wards.length}
                note="Xã, phường, đặc khu"
                icon={Globe2}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-emerald-800" />
                  <div>
                    <h3 className="font-bold">Quản lý địa danh</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Thông tin, tọa độ, ảnh, lịch sử và đa phương tiện.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setTab("places")}
                    className={secondaryButton}
                  >
                    Mở danh sách
                  </button>

                  <button
                    onClick={() => {
                      setTab("places");
                      openCreatePlace();
                    }}
                    className={primaryButton}
                  >
                    <Plus className="h-4 w-4" />
                    Thêm địa danh
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-sky-800" />
                  <div>
                    <h3 className="font-bold">Quản lý câu chuyện theo chủ đề</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Lịch sử, văn hóa, con người, ẩm thực và các câu chuyện khác.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setTab("stories")}
                    className={secondaryButton}
                  >
                    Mở danh sách
                  </button>

                  <button
                    onClick={() => {
                      setTab("stories");
                      openCreateStory();
                    }}
                    className={primaryButton}
                  >
                    <Plus className="h-4 w-4" />
                    Thêm câu chuyện
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {(tab === "places" || tab === "stories") && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div>
                <h3 className="font-bold text-slate-900">
                  {tab === "places" ? "Danh sách địa danh" : "Danh sách câu chuyện"}
                </h3>

                <p className="mt-1 text-[11px] text-slate-500">
                  {tab === "places"
                    ? "Tìm kiếm, lọc, thêm, sửa và xóa địa danh."
                    : "Thêm, sửa, xóa và phân loại câu chuyện."}
                </p>
              </div>

              <button
                onClick={tab === "places" ? openCreatePlace : openCreateStory}
                className={primaryButton}
              >
                <Plus className="h-4 w-4" />
                {tab === "places" ? "Thêm địa danh" : "Thêm câu chuyện"}
              </button>
            </div>

            {tab === "stories" && storyLoadError && (
              <div className="m-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {storyLoadError}. Cần kiểm tra bảng ward_stories và quyền truy cập Supabase.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === "places"
                      ? "Tìm tên, slug, địa chỉ..."
                      : "Tìm tiêu đề, nội dung câu chuyện..."
                  }
                  className={`${inputClass} pl-9`}
                />
              </div>

              {tab === "places" ? (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Tất cả loại địa danh</option>
                  {placeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={storyCategoryFilter}
                  onChange={(e) => setStoryCategoryFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Tất cả nhóm câu chuyện</option>
                  {STORY_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">Tất cả xã/phường/đặc khu</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto p-2 sm:p-3">
              <table className="w-full min-w-[800px] border-separate border-spacing-y-1 text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5">Nội dung</th>
                    <th className="px-3 py-2.5">
                      {tab === "places" ? "Loại" : "Chủ đề"}
                    </th>
                    <th className="px-3 py-2.5">Địa bàn</th>
                    <th className="px-3 py-2.5 text-center">Thứ tự</th>
                    <th className="px-3 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {tab === "places" &&
                    visiblePlaces.map((place) => (
                      <tr key={place.id} className="bg-slate-50 hover:bg-emerald-50">
                        <td className="rounded-l-lg px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {place.cover_image ? (
                                <img
                                  src={place.cover_image}
                                  alt={place.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-300">
                                  <ImageIcon className="h-5 w-5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-xs truncate font-bold text-slate-800">
                                {place.name}
                              </p>
                              <p className="mt-1 max-w-xs truncate text-[10px] text-slate-500">
                                {place.address ||
                                  place.short_description ||
                                  "Chưa có mô tả ngắn"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5">{typeName(place.place_type_id)}</td>
                        <td className="px-3 py-2.5">{wardName(place.ward_id)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {place.sort_order ?? 0}
                        </td>

                        <td className="rounded-r-lg px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEditPlace(place)}
                              className={secondaryButton}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Sửa
                            </button>

                            <button
                              onClick={() => void deletePlace(place)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                              title="Xóa địa danh"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {tab === "stories" &&
                    visibleStories.map((story) => (
                      <tr key={story.id} className="bg-slate-50 hover:bg-emerald-50">
                        <td className="rounded-l-lg px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {story.cover_image ? (
                                <img
                                  src={story.cover_image}
                                  alt={story.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-300">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-xs truncate font-bold text-slate-800">
                                {story.title}
                              </p>
                              <p className="mt-1 max-w-xs truncate text-[10px] text-slate-500">
                                {story.summary || "Chưa có tóm tắt"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5">{categoryLabel(story.category)}</td>
                        <td className="px-3 py-2.5">{wardName(story.ward_id)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {story.sort_order ?? 0}
                        </td>

                        <td className="rounded-r-lg px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEditStory(story)}
                              className={secondaryButton}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Sửa
                            </button>

                            <button
                              onClick={() => void deleteStory(story)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                              title="Xóa câu chuyện"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {activeRowsCount === 0 && (
                    <tr>
                      <td colSpan={5} className="rounded-xl bg-slate-50 px-4 py-12 text-center">
                        <Search className="mx-auto h-6 w-6 text-slate-300" />
                        <p className="mt-2 font-semibold text-slate-700">
                          Không có nội dung phù hợp
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Thử đổi từ khóa hoặc điều kiện lọc.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                Hiển thị{" "}
                <strong>
                  {activeRowsCount
                    ? (page - 1) * PAGE_SIZE + 1
                    : 0}
                  –{Math.min(page * PAGE_SIZE, activeRowsCount)}
                </strong>{" "}
                trên <strong>{activeRowsCount}</strong> mục
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className={`${secondaryButton} !p-2`}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="rounded-md bg-white px-3 py-2 text-[10px] font-bold text-emerald-800 ring-1 ring-slate-200">
                  Trang {page}/{totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className={`${secondaryButton} !p-2`}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === "types" && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-slate-900">Loại địa danh</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Quản lý danh mục trong bảng place_types.
                </p>
              </div>

              <button onClick={openCreateType} className={primaryButton}>
                <Plus className="h-4 w-4" />
                Thêm loại địa danh
              </button>
            </div>

            <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {placeTypes.map((type) => {
                const count = places.filter(
                  (place) => place.place_type_id === type.id,
                ).length;

                return (
                  <div
                    key={type.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg bg-emerald-50 p-2 text-emerald-800">
                        <Tags className="h-4 w-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{type.name}</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {count} địa danh sử dụng
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditType(type)}
                        className={secondaryButton}
                        title="Sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => void deleteType(type)}
                        className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {!placeTypes.length && (
                <p className="col-span-full py-8 text-center text-xs text-slate-500">
                  Chưa có loại địa danh.
                </p>
              )}
            </div>
          </section>
        )}

        <footer className="py-5 text-center text-[10px] text-slate-400">
          Lâm Đồng – Bản giao hưởng xanh · Hệ thống quản trị nội dung số
        </footer>
      </div>

      {placeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePlaceModal();
          }}
        >
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 to-teal-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">
                  {editingPlaceId ? "Chỉnh sửa địa danh" : "Thêm địa danh"}
                </h2>
                <p className="mt-1 text-[10px] text-emerald-100">
                  Dữ liệu lưu vào bảng places.
                </p>
              </div>

              <button
                type="button"
                onClick={closePlaceModal}
                disabled={saving || uploadingImage}
                className="rounded-lg p-2 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={savePlace}>
              <div className="max-h-[calc(100dvh-150px)] space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5">
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">01 · Thông tin cơ bản</h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Tên địa danh"
                      value={placeForm.name}
                      onChange={(value) => updatePlace("name", value)}
                      required
                    />

                    <Field
                      label="Slug"
                      value={placeForm.slug}
                      onChange={(value) => updatePlace("slug", value)}
                      placeholder="Tự tạo nếu để trống"
                    />

                    <label>
                      <span className={labelClass}>Loại địa danh</span>
                      <select
                        value={placeForm.place_type_id}
                        onChange={(e) => updatePlace("place_type_id", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Chọn loại</option>
                        {placeTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <WardPicker
                      wards={wards}
                      value={placeForm.ward_id}
                      onChange={(value) => updatePlace("ward_id", value)}
                    />

                    <div className="md:col-span-2">
                      <Field
                        label="Địa chỉ"
                        value={placeForm.address}
                        onChange={(value) => updatePlace("address", value)}
                        placeholder="Địa chỉ cụ thể"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">02 · Tọa độ và hiển thị</h3>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field
                      label="Vĩ độ"
                      type="number"
                      value={placeForm.latitude}
                      onChange={(value) => updatePlace("latitude", value)}
                      placeholder="Latitude"
                    />

                    <Field
                      label="Kinh độ"
                      type="number"
                      value={placeForm.longitude}
                      onChange={(value) => updatePlace("longitude", value)}
                      placeholder="Longitude"
                    />

                    <Field
                      label="Thứ tự"
                      type="number"
                      value={placeForm.sort_order}
                      onChange={(value) => updatePlace("sort_order", value)}
                      placeholder="0"
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">03 · Ảnh đại diện</h3>

                  <div className="grid gap-4 md:grid-cols-[1fr_200px]">
                    <div>
                      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 text-center hover:border-emerald-500">
                        <Upload className="mb-2 h-5 w-5 text-emerald-800" />
                        <span className="text-xs font-semibold">
                          Chọn ảnh từ thiết bị
                        </span>
                        <span className="mt-1 text-[10px] text-slate-500">
                          JPG, PNG, WEBP · tối đa 5 MB
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={saving || uploadingImage}
                          onChange={(e) => {
                            handleImageChange(e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      {imageFile && (
                        <p className="mt-2 text-[10px] text-emerald-700">
                          Đã chọn: {imageFile.name}
                        </p>
                      )}

                      <div className="mt-3">
                        <Field
                          label="Hoặc URL ảnh"
                          value={placeForm.cover_image}
                          onChange={(value) => {
                            updatePlace("cover_image", value);
                            setImageFile(null);
                            setImagePreview(value);
                            setRemoveImage(false);
                          }}
                          placeholder="https://..."
                        />
                      </div>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview("");
                            updatePlace("cover_image", "");
                            setRemoveImage(true);
                          }}
                          className="mt-2 text-xs font-semibold text-rose-600"
                        >
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          Gỡ ảnh
                        </button>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>Xem trước</p>
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Xem trước ảnh địa danh"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">04 · Nội dung và tư liệu</h3>

                  <div className="space-y-3">
                    <TextArea
                      label="Mô tả ngắn"
                      value={placeForm.short_description}
                      onChange={(value) => updatePlace("short_description", value)}
                      rows={2}
                    />

                    <TextArea
                      label="Mô tả chi tiết"
                      value={placeForm.description}
                      onChange={(value) => updatePlace("description", value)}
                      rows={5}
                    />

                    <Field
                      label="Thời kỳ lịch sử"
                      value={placeForm.historical_period}
                      onChange={(value) => updatePlace("historical_period", value)}
                    />

                    <TextArea
                      label="Công nhận, xếp hạng"
                      value={placeForm.recognition}
                      onChange={(value) => updatePlace("recognition", value)}
                      rows={2}
                    />

                    <Field
                      label="Nguồn thông tin"
                      value={placeForm.source}
                      onChange={(value) => updatePlace("source", value)}
                      placeholder="Tài liệu/cơ quan cung cấp"
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">05 · Đa phương tiện</h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Đường dẫn VR360"
                      value={placeForm.vr360_url}
                      onChange={(value) => updatePlace("vr360_url", value)}
                      placeholder="https://..."
                    />

                    <Field
                      label="Đường dẫn âm thanh"
                      value={placeForm.audio_url}
                      onChange={(value) => updatePlace("audio_url", value)}
                      placeholder="https://..."
                    />

                    <div className="md:col-span-2">
                      <Field
                        label="Đường dẫn video"
                        value={placeForm.video_url}
                        onChange={(value) => updatePlace("video_url", value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePlaceModal}
                  disabled={saving || uploadingImage}
                  className={secondaryButton}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className={primaryButton}
                >
                  {saving || uploadingImage ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {uploadingImage
                    ? "Đang tải ảnh..."
                    : saving
                      ? "Đang lưu..."
                      : "Lưu địa danh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {storyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeStoryModal();
          }}
        >
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 to-teal-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">
                  {editingStoryId !== null
                    ? "Chỉnh sửa câu chuyện"
                    : "Thêm câu chuyện"}
                </h2>
                <p className="mt-1 text-[10px] text-emerald-100">
                  Nội dung được lưu trong bảng ward_stories.
                </p>
              </div>

              <button
                type="button"
                onClick={closeStoryModal}
                disabled={saving || uploadingImage}
                className="rounded-lg p-2 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveStory}>
              <div className="max-h-[calc(100dvh-150px)] space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-5">
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">
                    01 · Thông tin câu chuyện
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Tiêu đề câu chuyện"
                      value={storyForm.title}
                      onChange={(value) => updateStory("title", value)}
                      required
                      placeholder="Nhập tiêu đề"
                    />

                    <Field
                      label="Slug"
                      value={storyForm.slug}
                      onChange={(value) => updateStory("slug", value)}
                      placeholder="Tự tạo nếu để trống"
                    />

                    <label>
                      <span className={labelClass}>Chủ đề câu chuyện *</span>
                      <select
                        value={storyForm.category}
                        onChange={(e) =>
                          updateStory(
                            "category",
                            e.target.value as StoryCategory,
                          )
                        }
                        className={inputClass}
                      >
                        {STORY_CATEGORIES.map((category) => (
                          <option
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <WardPicker
                      wards={wards}
                      value={storyForm.ward_id}
                      onChange={(value) => updateStory("ward_id", value)}
                    />

                    <div className="md:col-span-2">
                      <TextArea
                        label="Tóm tắt câu chuyện"
                        value={storyForm.summary}
                        onChange={(value) => updateStory("summary", value)}
                        rows={3}
                        placeholder="Đoạn giới thiệu hiển thị trên thẻ câu chuyện"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <TextArea
                        label="Nội dung câu chuyện"
                        value={storyForm.content}
                        onChange={(value) => updateStory("content", value)}
                        rows={8}
                        placeholder="Nhập nội dung, diễn biến lịch sử, nhân vật, sự kiện và tư liệu liên quan..."
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">02 · Ảnh bìa</h3>

                  <div className="grid gap-4 md:grid-cols-[1fr_200px]">
                    <div>
                      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 text-center hover:border-emerald-500">
                        <Upload className="mb-2 h-5 w-5 text-emerald-800" />
                        <span className="text-xs font-semibold">
                          Chọn ảnh từ thiết bị
                        </span>
                        <span className="mt-1 text-[10px] text-slate-500">
                          JPG, PNG, WEBP · tối đa 5 MB
                        </span>

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={saving || uploadingImage}
                          onChange={(e) => {
                            handleImageChange(e.target.files?.[0]);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>

                      {imageFile && (
                        <p className="mt-2 text-[10px] text-emerald-700">
                          Đã chọn: {imageFile.name}
                        </p>
                      )}

                      <div className="mt-3">
                        <Field
                          label="Hoặc URL ảnh"
                          value={storyForm.cover_image}
                          onChange={(value) => {
                            updateStory("cover_image", value);
                            setImageFile(null);
                            setImagePreview(value);
                            setRemoveImage(false);
                          }}
                          placeholder="https://..."
                        />
                      </div>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview("");
                            updateStory("cover_image", "");
                            setRemoveImage(true);
                          }}
                          className="mt-2 text-xs font-semibold text-rose-600"
                        >
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          Gỡ ảnh
                        </button>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>Xem trước</p>
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Xem trước ảnh câu chuyện"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-7 w-7 text-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-bold">
                    03 · Media và nguồn tư liệu
                  </h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Đường dẫn VR360"
                      value={storyForm.vr360_url}
                      onChange={(value) => updateStory("vr360_url", value)}
                      placeholder="https://..."
                    />

                    <Field
                      label="Đường dẫn âm thanh"
                      value={storyForm.audio_url}
                      onChange={(value) => updateStory("audio_url", value)}
                      placeholder="https://..."
                    />

                    <div className="md:col-span-2">
                      <Field
                        label="Đường dẫn video"
                        value={storyForm.video_url}
                        onChange={(value) => updateStory("video_url", value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Field
                        label="Nguồn tư liệu"
                        value={storyForm.source}
                        onChange={(value) => updateStory("source", value)}
                        placeholder="Tên tài liệu, cơ quan, đường dẫn nguồn..."
                      />
                    </div>

                    <Field
                      label="Thứ tự hiển thị"
                      type="number"
                      value={storyForm.sort_order}
                      onChange={(value) => updateStory("sort_order", value)}
                    />
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeStoryModal}
                  disabled={saving || uploadingImage}
                  className={secondaryButton}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className={primaryButton}
                >
                  {saving || uploadingImage ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {uploadingImage
                    ? "Đang tải ảnh..."
                    : saving
                      ? "Đang lưu..."
                      : "Lưu câu chuyện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {typeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950 to-teal-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">
                  {editingTypeId ? "Sửa loại địa danh" : "Thêm loại địa danh"}
                </h2>
                <p className="mt-1 text-[10px] text-emerald-100">
                  Danh mục dùng cho bảng places.
                </p>
              </div>

              <button
                onClick={() => setTypeModalOpen(false)}
                disabled={savingType}
                className="rounded-lg p-2 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveType} className="space-y-4 p-5">
              <Field
                label="Tên loại địa danh"
                value={typeNameInput}
                onChange={setTypeNameInput}
                required
                placeholder="Ví dụ: Địa chỉ đỏ, Di tích lịch sử..."
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className={secondaryButton}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={savingType}
                  className={primaryButton}
                >
                  {savingType ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {editingTypeId ? "Lưu thay đổi" : "Thêm loại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}