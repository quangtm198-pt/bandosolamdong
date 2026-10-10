
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Pencil, Trash2, X, Upload, Image as ImageIcon,
  MapPin, ChevronLeft, ChevronRight, RefreshCw, LogOut,
  LoaderCircle, Globe2, Layers3, MapPinned, Sparkles,
  CheckCircle2, Tags, Settings2, AlertCircle, ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const BUCKET = "place-images";
const PAGE_SIZE = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type PlaceType = { id: string; name: string };
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

const EMPTY_FORM: PlaceForm = {
  name: "", slug: "", place_type_id: "", ward_id: "", address: "",
  latitude: "", longitude: "", short_description: "", description: "",
  cover_image: "", vr360_url: "", audio_url: "", video_url: "",
  historical_period: "", recognition: "", source: "", sort_order: "0",
};

const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const labelClass = "mb-1.5 block text-[12px] font-semibold text-slate-600";

const primaryButton =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-700 to-green-600 px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-800 hover:to-green-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

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

function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ".jpg";
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const clean = base.normalize("NFD")
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
    if (index < 0) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function asForm(place: Place): PlaceForm {
  return {
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
    sort_order: place.sort_order?.toString() ?? "0",
  };
}

function Field({
  label, value, onChange, placeholder, type = "text", required = false,
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
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
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
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} resize-y`}
      />
    </label>
  );
}

function SectionTitle({
  number, title, description,
}: {
  number: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700 to-teal-500 text-[11px] font-bold text-white">
        {number}
      </span>
      <div>
        <h3 className="text-[13px] font-bold text-slate-800">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title, value, note, icon: Icon, color,
}: {
  title: string;
  value: number;
  note: string;
  icon: typeof MapPin;
  color: "green" | "blue" | "violet" | "amber";
}) {
  const styles = {
    green: {
      bar: "from-emerald-600 to-green-400",
      icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    blue: {
      bar: "from-sky-600 to-cyan-400",
      icon: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    violet: {
      bar: "from-violet-600 to-purple-400",
      icon: "bg-violet-50 text-violet-700 ring-violet-100",
    },
    amber: {
      bar: "from-amber-500 to-orange-400",
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
    },
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-emerald-100/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles[color].bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-800">
            {value.toLocaleString("vi-VN")}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">{note}</p>
        </div>
        <div className={`rounded-xl p-2 ring-1 transition-transform duration-300 group-hover:scale-105 ${styles[color].icon}`}>
          <Icon className="h-4 w-4" />
        </div>
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlaceForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  const [wardSearch, setWardSearch] = useState("");
  const [wardDropdownOpen, setWardDropdownOpen] = useState(false);

  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeNameInput, setTypeNameInput] = useState("");

  const updateField = useCallback((key: keyof PlaceForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        { data: placeData, error: placeError },
        { data: typeData, error: typeError },
        { data: wardData, error: wardError },
      ] = await Promise.all([
        supabase.from("places").select("*")
          .order("sort_order", { ascending: true })
          .order("id", { ascending: false }),
        supabase.from("place_types").select("id,name").order("name"),
        supabase.from("wards").select("id,name,province_code")
          .eq("province_code", "68").order("name"),
      ]);

      if (placeError) throw placeError;
      if (typeError) throw typeError;
      if (wardError) throw wardError;

      setPlaces((placeData ?? []) as Place[]);
      setPlaceTypes((typeData ?? []) as PlaceType[]);
      setWards((wardData ?? []) as Ward[]);
    } catch (error) {
      alert(`Không tải được dữ liệu: ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const { data: { user }, error: authError } =
          await supabase.auth.getUser();

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
    return () => { active = false; };
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

    return places.filter((place) => {
      const matchesSearch = !keyword ||
        [place.name, place.slug, place.address, place.short_description]
          .filter(Boolean)
          .some((value) => normalizeText(String(value)).includes(keyword));

      const matchesType = !typeFilter ||
        place.place_type_id === typeFilter;

      const matchesWard = !wardFilter ||
        place.ward_id === wardFilter;

      return matchesSearch && matchesType && matchesWard;
    });
  }, [places, search, typeFilter, wardFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE));
  const visiblePlaces = filteredPlaces.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => { setPage(1); }, [search, typeFilter, wardFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const typeName = (id: string | null) =>
    placeTypes.find((item) => item.id === id)?.name ?? "Chưa phân loại";

  const wardName = (id: string | null) =>
    wards.find((item) => item.id === id)?.name ?? "Chưa chọn địa bàn";

  const filteredWards = useMemo(() => {
    const keyword = normalizeText(wardSearch);
    const matches = wards.filter((ward) =>
      !keyword || normalizeText(ward.name).includes(keyword)
    );

    // Luôn giữ địa bàn đang chọn trong danh sách để không mất lựa chọn khi sửa.
    const selected = wards.find((ward) => ward.id === form.ward_id);
    if (selected && !matches.some((ward) => ward.id === selected.id)) {
      return [selected, ...matches];
    }

    return matches;
  }, [wards, wardSearch, form.ward_id]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setWardSearch("");
    setWardDropdownOpen(false);
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);
    setModalOpen(true);
  }

  function openEdit(place: Place) {
    setEditingId(place.id);
    setForm(asForm(place));
    setWardSearch(wards.find((ward) => ward.id === place.ward_id)?.name ?? "");
    setWardDropdownOpen(false);
    setImageFile(null);
    setImagePreview(place.cover_image ?? "");
    setRemoveImage(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving || uploadingImage) return;
    setModalOpen(false);
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);
    setWardDropdownOpen(false);
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

  async function uploadImage(file: File, id: string) {
    const path = `places/${id}/${Date.now()}-${safeFileName(file.name)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;

    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function deleteStoredImage(url: string | null | undefined) {
    const path = storagePath(url);
    if (!path) return;

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.error("Không xóa được ảnh:", error.message);
  }

  async function savePlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên địa danh.");
      return;
    }

    if (form.latitude.trim() && !Number.isFinite(Number(form.latitude))) {
      alert("Vĩ độ không hợp lệ.");
      return;
    }

    if (form.longitude.trim() && !Number.isFinite(Number(form.longitude))) {
      alert("Kinh độ không hợp lệ.");
      return;
    }

    const latitude = form.latitude.trim() ? Number(form.latitude) : null;
    const longitude = form.longitude.trim() ? Number(form.longitude) : null;

    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      alert("Vĩ độ phải nằm trong khoảng -90 đến 90.");
      return;
    }

    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      alert("Kinh độ phải nằm trong khoảng -180 đến 180.");
      return;
    }

    if (form.sort_order.trim() && !Number.isFinite(Number(form.sort_order))) {
      alert("Thứ tự hiển thị không hợp lệ.");
      return;
    }

    const mediaUrls = [
      ["Ảnh đại diện", form.cover_image],
      ["VR360", form.vr360_url],
      ["Âm thanh", form.audio_url],
      ["Video", form.video_url],
    ] as const;

    for (const [label, value] of mediaUrls) {
      if (label === "Ảnh đại diện" && (imageFile || removeImage)) continue;
      if (!value.trim()) continue;

      try {
        const parsed = new URL(value.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        alert(`${label}: vui lòng nhập đường dẫn URL hợp lệ.`);
        return;
      }
    }

    setSaving(true);
    let uploadedUrl: string | null = null;
    let databaseSaved = false;

    try {
      const oldPlace = editingId
        ? places.find((place) => place.id === editingId)
        : undefined;

      let coverImage = removeImage ? null : form.cover_image.trim() || null;

      if (imageFile) {
        setUploadingImage(true);
        const storageId = editingId ?? crypto.randomUUID();
        uploadedUrl = await uploadImage(imageFile, storageId);
        coverImage = uploadedUrl;
      }
      const nextSortOrder =
      places.reduce(
        (max, place) => Math.max(max, place.sort_order ?? 0),
        0
      ) + 1;
    
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        // Các ID là UUID: giữ nguyên chuỗi, tuyệt đối không dùng Number().
        place_type_id: form.place_type_id || null,
        ward_id: form.ward_id || null,
        address: form.address.trim() || null,
        latitude,
        longitude,
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        cover_image: coverImage,
        vr360_url: form.vr360_url.trim() || null,
        audio_url: form.audio_url.trim() || null,
        video_url: form.video_url.trim() || null,
        historical_period: form.historical_period.trim() || null,
        recognition: form.recognition.trim() || null,
        source: form.source.trim() || null,
        sort_order: editingId
  ? places.find((place) => place.id === editingId)?.sort_order ?? nextSortOrder
  : nextSortOrder,
      };

      if (editingId !== null) {
        const { data, error } = await supabase
          .from("places")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "Supabase không trả về địa danh đã cập nhật. Có thể ID không đúng hoặc tài khoản không có quyền cập nhật (RLS)."
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

      // Chỉ xóa ảnh cũ sau khi dữ liệu mới đã lưu thành công.
      if (oldPlace?.cover_image && oldPlace.cover_image !== coverImage) {
        await deleteStoredImage(oldPlace.cover_image);
      }

      setModalOpen(false);
      setImageFile(null);
      setImagePreview("");
      setRemoveImage(false);
      setWardDropdownOpen(false);

      await loadData();

      alert(editingId !== null ? "Đã cập nhật địa danh." : "Đã thêm địa danh.");
    } catch (error) {
      // Không xóa ảnh mới nếu bản ghi đã lưu thành công.
      if (uploadedUrl && !databaseSaved) {
        await deleteStoredImage(uploadedUrl);
      }

      alert(`Không lưu được dữ liệu: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  async function deletePlace(place: Place) {
    if (!window.confirm(`Bạn có chắc muốn xóa địa danh "${place.name}" không?`)) {
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
        throw new Error("Không xóa được địa danh. Hãy kiểm tra quyền truy cập.");
      }

      await deleteStoredImage(place.cover_image);
      await loadData();
      alert("Đã xóa địa danh.");
    } catch (error) {
      alert(`Không xóa được địa danh: ${errorMessage(error)}`);
    }
  }

  function openCreateType() {
    setEditingTypeId(null);
    setTypeNameInput("");
    setTypesModalOpen(true);
  }

  function openEditType(type: PlaceType) {
    setEditingTypeId(type.id);
    setTypeNameInput(type.name);
    setTypesModalOpen(true);
  }

  async function saveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = typeNameInput.trim();
    if (!name) {
      alert("Vui lòng nhập tên loại địa danh.");
      return;
    }

    const duplicate = placeTypes.some(
      (type) =>
        normalizeText(type.name) === normalizeText(name) &&
        type.id !== editingTypeId
    );

    if (duplicate) {
      alert("Tên loại địa danh này đã tồn tại.");
      return;
    }

    setSavingType(true);

    try {
      if (editingTypeId !== null) {
        const { data, error } = await supabase
          .from("place_types")
          .update({ name })
          .eq("id", editingTypeId)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Không cập nhật được loại địa danh.");
      } else {
        const { error } = await supabase.from("place_types").insert({ name });
        if (error) throw error;
      }

      setTypesModalOpen(false);
      await loadData();

      alert(editingTypeId !== null
        ? "Đã cập nhật loại địa danh."
        : "Đã thêm loại địa danh.");
    } catch (error) {
      alert(`Không lưu được loại địa danh: ${errorMessage(error)}`);
    } finally {
      setSavingType(false);
    }
  }

  async function deleteType(type: PlaceType) {
    const usage = places.filter((place) => place.place_type_id === type.id).length;

    if (usage > 0) {
      alert(
        `Không thể xóa loại "${type.name}" vì đang được sử dụng bởi ${usage} địa danh. ` +
        "Hãy chỉnh sửa các địa danh đó sang loại khác trước khi xóa."
      );
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa loại "${type.name}" không?`)) {
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
      alert(`Đã xóa loại "${type.name}".`);
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
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-5 py-4 text-[13px] text-slate-600 shadow-lg">
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
          Đang tải dữ liệu quản trị...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 text-slate-800">
      <header className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 text-white shadow-md">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/5" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <MapPinned className="h-5 w-5 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-emerald-300/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                  CMS · ADMIN
                </span>
              </div>
              <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
                Quản trị bản đồ số
              </h1>
              <p className="mt-0.5 text-[11px] text-emerald-100/80 sm:text-xs">
                Lâm Đồng – Bản giao hưởng xanh
              </p>
            </div>
          </div>

          <button onClick={logout} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white transition-all hover:bg-white/20 active:scale-95">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Không gian quản trị nội dung
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Tổng quan hệ thống
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">
              Quản lý địa danh, phân loại, địa bàn và nội dung đa phương tiện.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Hệ thống quản trị
          </span>
        </div>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard title="Tổng địa danh" value={places.length} note="Địa danh trong hệ thống" icon={MapPin} color="green" />
          <StatCard title="Loại địa danh" value={placeTypes.length} note="Nhóm phân loại nội dung" icon={Layers3} color="blue" />
          <StatCard title="Địa bàn" value={wards.length} note="Xã, phường, đặc khu" icon={Globe2} color="violet" />
          <StatCard title="Kết quả hiện tại" value={filteredPlaces.length} note="Theo điều kiện tìm kiếm" icon={MapPinned} color="amber" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white/95 shadow-lg shadow-emerald-950/5">
          <div className="flex flex-col justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-teal-50/60 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách địa danh</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Thêm mới, chỉnh sửa, xóa và lọc thông tin địa danh.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void loadData()} className={secondaryButton}>
                <RefreshCw className="h-3.5 w-3.5" /> Làm mới
              </button>
              <button onClick={openCreateType} className={secondaryButton}>
                <Settings2 className="h-3.5 w-3.5" /> Quản lý loại
              </button>
              <button onClick={openCreate} className={primaryButton}>
                <Plus className="h-3.5 w-3.5" /> Thêm địa danh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 border-b border-emerald-100 bg-emerald-50/60 p-3.5 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-700" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, slug, địa chỉ..."
                className={`${inputClass} pl-9`}
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
              <option value="">Tất cả loại địa danh</option>
              {placeTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className={inputClass}>
              <option value="">Tất cả xã/phường/đặc khu</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto p-2 sm:p-3">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-1 text-left text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5 font-bold">Thông tin địa danh</th>
                  <th className="px-3 py-2.5 font-bold">Loại địa danh</th>
                  <th className="px-3 py-2.5 font-bold">Địa bàn</th>
                  <th className="px-3 py-2.5 text-center font-bold">Thứ tự</th>
                  <th className="px-3 py-2.5 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlaces.map((place) => (
                  <tr key={place.id} className="group bg-emerald-50/80 transition-colors duration-200 hover:bg-emerald-100">
                    <td className="rounded-l-lg px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-emerald-100 bg-white">
                          {place.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={place.cover_image} alt={place.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-emerald-300">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-xs truncate text-[12px] font-bold text-slate-800 group-hover:text-emerald-900">
                            {place.name}
                          </p>
                          <p className="mt-1 max-w-xs truncate text-[10px] text-slate-500">
                            {place.address || "Chưa cập nhật địa chỉ"}
                          </p>
                          {place.latitude != null && place.longitude != null && (
                            <p className="mt-0.5 text-[10px] text-emerald-700">
                              {place.latitude}, {place.longitude}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
                        {typeName(place.place_type_id)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-md border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">
                        {wardName(place.ward_id)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-semibold tabular-nums text-slate-600">
                      {place.sort_order ?? 0}
                    </td>
                    <td className="rounded-r-lg px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(place)} title="Chỉnh sửa" className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-emerald-800 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:text-white active:scale-95">
                          <Pencil className="h-3 w-3" /> Sửa
                        </button>
                        <button onClick={() => void deletePlace(place)} title="Xóa địa danh" className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1.5 text-[10px] font-bold text-rose-600 transition-all hover:-translate-y-0.5 hover:bg-rose-600 hover:text-white active:scale-95">
                          <Trash2 className="h-3 w-3" /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!visiblePlaces.length && (
                  <tr>
                    <td colSpan={5} className="rounded-xl bg-emerald-50/70 px-4 py-12 text-center">
                      <Search className="mx-auto h-6 w-6 text-emerald-500" />
                      <p className="mt-2 text-[12px] font-semibold text-slate-700">Không tìm thấy địa danh</p>
                      <p className="mt-1 text-[11px] text-slate-500">Thử thay đổi từ khóa hoặc điều kiện lọc.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-emerald-100 bg-emerald-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-500">
              Hiển thị{" "}
              <strong className="text-slate-800">
                {filteredPlaces.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredPlaces.length)}
              </strong>{" "}
              trên <strong className="text-slate-800">{filteredPlaces.length}</strong> địa danh
            </p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={`${secondaryButton} !p-1.5`} aria-label="Trang trước">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="rounded-md bg-white px-3 py-1.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-100">
                Trang {page}/{totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={`${secondaryButton} !p-1.5`} aria-label="Trang sau">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-[10px] text-slate-400">
          <span className="font-semibold text-emerald-700">Lâm Đồng – Bản giao hưởng xanh</span>
          {" "}· Hệ thống quản trị nội dung số
        </footer>
      </div>

      {/* Thêm/chỉnh sửa địa danh */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-4 py-4 text-white sm:px-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  {editingId !== null ? <Pencil className="h-4 w-4" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-[14px] font-bold">
                    {editingId !== null ? "Chỉnh sửa địa danh" : "Thêm địa danh mới"}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-emerald-100">Thông tin có dấu * là bắt buộc.</p>
                </div>
              </div>
              <button type="button" onClick={closeModal} disabled={saving || uploadingImage} className="cursor-pointer rounded-lg p-2 transition hover:rotate-90 hover:bg-white/15 disabled:cursor-not-allowed" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={savePlace}>
              <div className="max-h-[calc(100dvh-160px)] space-y-4 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6">
                <section className="rounded-xl border border-slate-100 bg-white p-4">
                  <SectionTitle number="01" title="Thông tin cơ bản" />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Tên địa danh" value={form.name} onChange={(v) => updateField("name", v)} placeholder="Nhập tên địa danh" required />
                    <Field label="Slug" value={form.slug} onChange={(v) => updateField("slug", v)} placeholder="ten-dia-danh" />

                    <label className="block min-w-0">
                      <span className={labelClass}>Loại địa danh</span>
                      <select
                        value={form.place_type_id}
                        onChange={(e) => updateField("place_type_id", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Chọn loại địa danh</option>
                        {placeTypes.map((type) => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </label>

                    {/* Ô tìm kiếm địa bàn */}
                    <div className="relative min-w-0">
                      <span className={labelClass}>Xã/phường/đặc khu</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-700" />
                        <input
                          value={wardSearch}
                          onFocus={() => setWardDropdownOpen(true)}
                          onChange={(e) => {
                            setWardSearch(e.target.value);
                            setWardDropdownOpen(true);
                            // Không tự xóa địa bàn đã chọn chỉ vì đang gõ tìm kiếm.
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setWardDropdownOpen(false);
                            if (e.key === "Enter" && filteredWards.length === 1) {
                              e.preventDefault();
                              updateField("ward_id", filteredWards[0].id);
                              setWardSearch(filteredWards[0].name);
                              setWardDropdownOpen(false);
                            }
                          }}
                          placeholder="Gõ tên địa bàn để tìm..."
                          className={`${inputClass} pr-9 pl-9`}
                          role="combobox"
                          aria-expanded={wardDropdownOpen}
                          aria-autocomplete="list"
                        />
                        <button
                          type="button"
                          onClick={() => setWardDropdownOpen((open) => !open)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-emerald-50"
                          aria-label="Mở danh sách địa bàn"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      {wardDropdownOpen && (
                        <>
                          <button
                            type="button"
                            aria-label="Đóng danh sách địa bàn"
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={() => setWardDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-1.5 shadow-xl">
                            <p className="sticky top-0 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-500">
                              {filteredWards.length} địa bàn phù hợp
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                updateField("ward_id", "");
                                setWardSearch("");
                                setWardDropdownOpen(false);
                              }}
                              className="w-full rounded-lg px-2.5 py-2 text-left text-[12px] text-slate-500 hover:bg-slate-50"
                            >
                              Bỏ chọn địa bàn
                            </button>

                            {filteredWards.map((ward) => (
                              <button
                                type="button"
                                key={ward.id}
                                onClick={() => {
                                  updateField("ward_id", ward.id);
                                  setWardSearch(ward.name);
                                  setWardDropdownOpen(false);
                                }}
                                className={`w-full rounded-lg px-2.5 py-2 text-left text-[12px] transition hover:bg-emerald-50 ${
                                  form.ward_id === ward.id
                                    ? "bg-emerald-50 font-semibold text-emerald-800"
                                    : "text-slate-700"
                                }`}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span>{ward.name}</span>
                                  {form.ward_id === ward.id && (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                                  )}
                                </span>
                              </button>
                            ))}

                            {!filteredWards.length && (
                              <p className="px-3 py-5 text-center text-[11px] text-slate-500">
                                Không tìm thấy địa bàn phù hợp.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        {form.ward_id
                          ? `Đã chọn: ${wardName(form.ward_id)}`
                          : "Nhập vài ký tự để thu hẹp danh sách."}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <Field label="Địa chỉ" value={form.address} onChange={(v) => updateField("address", v)} placeholder="Địa chỉ cụ thể" />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-4">
                  <SectionTitle number="02" title="Tọa độ bản đồ" />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label="Vĩ độ (Latitude)" value={form.latitude} onChange={(v) => updateField("latitude", v)} type="number" placeholder="11.9404" />
                    <Field label="Kinh độ (Longitude)" value={form.longitude} onChange={(v) => updateField("longitude", v)} type="number" placeholder="108.4583" />
                    <Field label="Thứ tự hiển thị" value={form.sort_order} onChange={(v) => updateField("sort_order", v)} type="number" placeholder="0" />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-4">
                  <SectionTitle number="03" title="Ảnh đại diện" description="Chọn ảnh từ thiết bị hoặc nhập URL ảnh." />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                    <div>
                      <label className="group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-3 py-5 text-center transition-all hover:border-emerald-500 hover:shadow-inner">
                        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-700 to-teal-500 text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
                          <Upload className="h-5 w-5" />
                        </span>
                        <span className="text-[12px] font-bold text-emerald-950">Nhấn để chọn ảnh</span>
                        <span className="mt-1 text-[10px] text-slate-500">JPG, PNG, WEBP · tối đa 5 MB</span>
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
                        <p className="mt-2 break-all rounded-lg bg-emerald-50 p-2 text-[10px] text-emerald-800">
                          Đã chọn: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}

                      <div className="mt-3">
                        <Field
                          label="Hoặc nhập URL ảnh"
                          value={form.cover_image}
                          onChange={(value) => {
                            updateField("cover_image", value);
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
                            updateField("cover_image", "");
                            setRemoveImage(true);
                          }}
                          className="mt-2 cursor-pointer text-[11px] font-semibold text-rose-600 hover:underline"
                        >
                          <Trash2 className="mr-1 inline h-3 w-3" /> Gỡ ảnh
                        </button>
                      )}
                    </div>

                    <div>
                      <p className={labelClass}>Xem trước ảnh</p>
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                        {imagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagePreview} alt="Xem trước ảnh" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-emerald-300">
                            <ImageIcon className="h-7 w-7" />
                            <span className="text-[10px]">Chưa có ảnh</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-4">
                  <SectionTitle number="04" title="Nội dung giới thiệu" />
                  <div className="space-y-3">
                    <TextArea label="Mô tả ngắn" value={form.short_description} onChange={(v) => updateField("short_description", v)} placeholder="Tóm tắt nội dung nổi bật..." rows={2} />
                    <TextArea label="Mô tả chi tiết" value={form.description} onChange={(v) => updateField("description", v)} placeholder="Lịch sử, ý nghĩa và câu chuyện..." rows={4} />
                    <Field label="Thời kỳ lịch sử" value={form.historical_period} onChange={(v) => updateField("historical_period", v)} placeholder="Thời kỳ lịch sử..." />
                    <TextArea label="Công nhận, xếp hạng" value={form.recognition} onChange={(v) => updateField("recognition", v)} placeholder="Thông tin công nhận, xếp hạng..." rows={2} />
                    <Field label="Nguồn thông tin" value={form.source} onChange={(v) => updateField("source", v)} placeholder="Tài liệu hoặc cơ quan cung cấp..." />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-white p-4">
                  <SectionTitle number="05" title="Nội dung đa phương tiện" />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Đường dẫn VR360" value={form.vr360_url} onChange={(v) => updateField("vr360_url", v)} placeholder="https://..." />
                    <Field label="Đường dẫn audio" value={form.audio_url} onChange={(v) => updateField("audio_url", v)} placeholder="https://..." />
                    <div className="md:col-span-2">
                      <Field label="Đường dẫn video" value={form.video_url} onChange={(v) => updateField("video_url", v)} placeholder="https://..." />
                    </div>
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={closeModal} disabled={saving || uploadingImage} className={secondaryButton}>
                  Hủy
                </button>
                <button type="submit" disabled={saving || uploadingImage} className={primaryButton}>
                  {saving || uploadingImage ? (
                    <>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      {uploadingImage ? "Đang tải ảnh..." : "Đang lưu..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Lưu địa danh
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quản lý loại địa danh */}
      {typesModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !savingType) setTypesModalOpen(false);
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-700 px-4 py-4 text-white sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Tags className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold">Quản lý loại địa danh</h2>
                  <p className="mt-0.5 text-[10px] text-emerald-100">
                    Thêm, đổi tên hoặc xóa loại phân loại.
                  </p>
                </div>
              </div>
              <button onClick={() => setTypesModalOpen(false)} disabled={savingType} className="cursor-pointer rounded-lg p-2 transition hover:bg-white/15 disabled:cursor-not-allowed" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <form onSubmit={saveType} className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                <p className="mb-2 text-[12px] font-bold text-slate-800">
                  {editingTypeId !== null ? "Chỉnh sửa tên loại" : "Thêm loại địa danh mới"}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={typeNameInput}
                    onChange={(e) => setTypeNameInput(e.target.value)}
                    placeholder="Ví dụ: Địa chỉ đỏ, Di tích lịch sử..."
                    className={`${inputClass} flex-1`}
                    required
                  />
                  <button type="submit" disabled={savingType} className={primaryButton}>
                    {savingType
                      ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      : editingTypeId !== null
                        ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : <Plus className="h-3.5 w-3.5" />}
                    {editingTypeId !== null ? "Lưu thay đổi" : "Thêm loại"}
                  </button>
                  {editingTypeId !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTypeId(null);
                        setTypeNameInput("");
                      }}
                      className={secondaryButton}
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>
              </form>

              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-700">Các loại hiện có</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                  {placeTypes.length} loại
                </span>
              </div>

              <div className="max-h-[45vh] space-y-1.5 overflow-y-auto">
                {placeTypes.map((type) => {
                  const count = places.filter((place) => place.place_type_id === type.id).length;

                  return (
                    <div key={type.id} className="group flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 transition-colors hover:bg-emerald-100">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                          <Tags className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-slate-800">{type.name}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {count} địa danh đang sử dụng
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button onClick={() => openEditType(type)} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-emerald-800 transition hover:bg-emerald-700 hover:text-white" title="Sửa loại">
                          <Pencil className="h-3 w-3" /> Sửa
                        </button>
                        <button onClick={() => void deleteType(type)} className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white" title={count ? "Loại đang được sử dụng" : "Xóa loại"}>
                          <Trash2 className="h-3 w-3" /> Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!placeTypes.length && (
                  <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
                    <AlertCircle className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-2 text-[12px] text-slate-500">Chưa có loại địa danh.</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Không thể xóa loại đang được sử dụng. Hãy sửa các địa danh liên quan sang loại khác trước khi xóa. Đổi tên loại sẽ áp dụng cho các địa danh đang dùng loại đó.
                </p>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button onClick={() => setTypesModalOpen(false)} className={secondaryButton}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
