
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Ward = {
  id: string;
  name: string;
  type: string | null;
  code: string | null;
  province_code: string;
};

type PlaceType = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
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
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type FormData = {
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
  is_published: boolean;
};

const emptyForm: FormData = {
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
  sort_order: "0",
  is_published: true,
};

const inputClass =
  "w-full rounded-xl border border-[#d7e4dc] bg-white px-3 py-2.5 text-sm text-[#29483a] outline-none transition focus:border-[#15945b] focus:ring-2 focus:ring-[#15945b]/10";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function makeSlug(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidHttpUrl(value: string) {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-[#536c60]">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#d8eadf] bg-white">
      <h3 className="border-b border-[#edf2ee] px-4 py-3 text-sm font-bold text-[#315747]">
        {title}
      </h3>
      <div className="grid gap-4 p-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  color: "green" | "blue" | "purple" | "orange";
}) {
  const colors = {
    green: {
      card: "border-emerald-200 bg-emerald-50/80",
      icon: "bg-emerald-100 text-emerald-700",
      label: "text-emerald-800",
      value: "text-emerald-700",
    },
    blue: {
      card: "border-sky-200 bg-sky-50/80",
      icon: "bg-sky-100 text-sky-700",
      label: "text-sky-800",
      value: "text-sky-700",
    },
    purple: {
      card: "border-violet-200 bg-violet-50/80",
      icon: "bg-violet-100 text-violet-700",
      label: "text-violet-800",
      value: "text-violet-700",
    },
    orange: {
      card: "border-orange-200 bg-orange-50/80",
      icon: "bg-orange-100 text-orange-700",
      label: "text-orange-800",
      value: "text-orange-700",
    },
  };

  const style = colors[color];

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 sm:gap-3 sm:p-3 ${style.card}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${style.icon}`}
      >
        {value}
      </div>
      <div className="min-w-0">
        <p
          className={`truncate text-[9px] font-bold sm:text-[11px] ${style.label}`}
        >
          {label}
        </p>
        <p className={`mt-0.5 truncate text-[9px] sm:text-[10px] ${style.value}`}>
          {detail}
        </p>
      </div>
    </div>
  );
}

function AdminContent() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPublished, setFilterPublished] = useState("all");
  const [filterCoordinates, setFilterCoordinates] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [wardSearch, setWardSearch] = useState("");
  const [wardOpen, setWardOpen] = useState(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const [placesRes, wardsRes, typesRes] = await Promise.all([
        supabase.from("places").select("*").order("sort_order"),
        supabase
          .from("wards")
          .select("id,name,type,code,province_code")
          .eq("province_code", "68")
          .order("name"),
        // Lấy cả loại đã ngừng hoạt động để không mất nhãn
        // của địa danh cũ khi chỉnh sửa.
        supabase.from("place_types").select("*").order("sort_order"),
      ]);

      if (placesRes.error) {
        alert(`Không tải được danh sách địa danh: ${placesRes.error.message}`);
      } else {
        setPlaces((placesRes.data || []) as Place[]);
      }

      if (wardsRes.error) {
        alert(`Không tải được danh sách địa bàn: ${wardsRes.error.message}`);
      } else {
        setWards((wardsRes.data || []) as Ward[]);
      }

      if (typesRes.error) {
        alert(`Không tải được loại địa danh: ${typesRes.error.message}`);
      } else {
        setPlaceTypes((typesRes.data || []) as PlaceType[]);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
      alert("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử tải lại trang.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPlaces = useMemo(() => {
    const keyword = normalizeText(search);

    return places.filter((p) => {
      const matchesKeyword =
        !keyword ||
        normalizeText(p.name).includes(keyword) ||
        normalizeText(p.address || "").includes(keyword) ||
        normalizeText(p.short_description || "").includes(keyword);

      const matchesWard = !filterWard || p.ward_id === filterWard;
      const matchesType = !filterType || p.place_type_id === filterType;

      const matchesPublished =
        filterPublished === "all" ||
        (filterPublished === "published" && p.is_published) ||
        (filterPublished === "hidden" && !p.is_published);

      const hasCoordinates =
        p.latitude !== null &&
        p.longitude !== null &&
        Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude));

      const matchesCoordinates =
        filterCoordinates === "all" ||
        (filterCoordinates === "has" && hasCoordinates) ||
        (filterCoordinates === "missing" && !hasCoordinates);

      return (
        matchesKeyword &&
        matchesWard &&
        matchesType &&
        matchesPublished &&
        matchesCoordinates
      );
    });
  }, [
    places,
    search,
    filterWard,
    filterType,
    filterPublished,
    filterCoordinates,
  ]);

  const filteredWards = useMemo(() => {
    const keyword = normalizeText(wardSearch);
    const result = keyword
      ? wards.filter((w) => normalizeText(w.name).includes(keyword))
      : wards;

    return result.slice(0, 124);
  }, [wards, wardSearch]);

  const selectedWard = wards.find((w) => w.id === form.ward_id);

  const stats = useMemo(
    () => ({
      total: places.length,
      published: places.filter((p) => p.is_published).length,
      hidden: places.filter((p) => !p.is_published).length,
      mapped: places.filter(
        (p) =>
          p.latitude !== null &&
          p.longitude !== null &&
          Number.isFinite(Number(p.latitude)) &&
          Number.isFinite(Number(p.longitude)),
      ).length,
    }),
    [places],
  );

  function updateField<K extends keyof FormData>(
    key: K,
    value: FormData[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setWardSearch("");
    setWardOpen(false);
    setModalOpen(true);
  }

  function openEdit(p: Place) {
    setEditingId(p.id);

    setForm({
      name: p.name || "",
      slug: p.slug || "",
      place_type_id: p.place_type_id || "",
      ward_id: p.ward_id || "",
      address: p.address || "",
      latitude: p.latitude?.toString() || "",
      longitude: p.longitude?.toString() || "",
      short_description: p.short_description || "",
      description: p.description || "",
      cover_image: p.cover_image || "",
      vr360_url: p.vr360_url || "",
      audio_url: p.audio_url || "",
      video_url: p.video_url || "",
      historical_period: p.historical_period || "",
      recognition: p.recognition || "",
      source: p.source || "",
      sort_order: String(p.sort_order ?? 0),
      is_published: p.is_published,
    });

    setWardSearch("");
    setWardOpen(false);
    setModalOpen(true);
  }

  async function savePlace() {
    if (saving) return;

    if (!form.name.trim()) {
      alert("Vui lòng nhập tên địa danh.");
      return;
    }

    if (!form.ward_id) {
      alert("Vui lòng chọn xã, phường hoặc đặc khu.");
      return;
    }

    const latitudeText = form.latitude.trim();
    const longitudeText = form.longitude.trim();

    // Không chấp nhận chỉ nhập một trong hai tọa độ.
    if (Boolean(latitudeText) !== Boolean(longitudeText)) {
      alert("Vui lòng nhập đầy đủ cả vĩ độ và kinh độ.");
      return;
    }

    const lat = latitudeText ? Number(latitudeText) : null;
    const lng = longitudeText ? Number(longitudeText) : null;

    if (
      (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
      (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))
    ) {
      alert(
        "Tọa độ không hợp lệ. Vĩ độ phải từ -90 đến 90; kinh độ từ -180 đến 180.",
      );
      return;
    }

    if (
      form.is_published &&
      (lat === null || lng === null)
    ) {
      const confirmed = confirm(
        "Địa danh chưa có tọa độ nên có thể không xuất hiện đúng vị trí trên bản đồ. Bạn vẫn muốn công khai?",
      );

      if (!confirmed) return;
    }

    const urls = [
      ["Ảnh đại diện", form.cover_image],
      ["VR360", form.vr360_url],
      ["Âm thanh", form.audio_url],
      ["Video", form.video_url],
    ] as const;

    for (const [label, value] of urls) {
      if (!isValidHttpUrl(value)) {
        alert(`${label} phải là đường dẫn http:// hoặc https:// hợp lệ.`);
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || makeSlug(form.name),
        place_type_id: form.place_type_id || null,
        ward_id: form.ward_id,
        address: form.address.trim() || null,
        latitude: lat,
        longitude: lng,
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        cover_image: form.cover_image.trim() || null,
        vr360_url: form.vr360_url.trim() || null,
        audio_url: form.audio_url.trim() || null,
        video_url: form.video_url.trim() || null,
        historical_period: form.historical_period.trim() || null,
        recognition: form.recognition.trim() || null,
        source: form.source.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      };

      const result = editingId
        ? await supabase
            .from("places")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("places").insert(payload);

      if (result.error) {
        alert(`Không lưu được dữ liệu:\n${result.error.message}`);
        return;
      }

      setModalOpen(false);
      await loadData(false);
    } catch (error) {
      console.error("Lỗi lưu địa danh:", error);
      alert("Có lỗi xảy ra khi lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(p: Place) {
    const { error } = await supabase
      .from("places")
      .update({
        is_published: !p.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);

    if (error) {
      alert(`Không đổi được trạng thái: ${error.message}`);
      return;
    }

    await loadData(false);
  }

  async function deletePlace(p: Place) {
    const confirmed = confirm(
      `Bạn có chắc muốn xóa địa danh "${p.name}"?\nThao tác này không thể tự hoàn tác.`,
    );

    if (!confirmed) return;

    const { error } = await supabase.from("places").delete().eq("id", p.id);

    if (error) {
      alert(`Không xóa được địa danh: ${error.message}`);
      return;
    }

    await loadData(false);
  }

  return (
    <main className="min-h-screen bg-[#f3f7f4] text-[#29483a]">
      <header className="border-b border-[#dce8e0] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-[#087b4c] p-2.5 text-white">
              <MapPin size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#087b4c] sm:text-base">
                QUẢN TRỊ BẢN ĐỒ SỐ
              </h1>
              <p className="mt-0.5 text-[10px] text-[#87978e]">
                Lâm Đồng – Bản giao hưởng xanh
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#087b4c] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#06683f] sm:gap-2 sm:px-4"
          >
            <Plus size={16} />
            Thêm địa danh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-3 py-5 sm:px-5 sm:py-6">
        {/* Bốn ô thống kê gọn, có màu riêng */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatCard
            label="TỔNG ĐỊA DANH"
            value={stats.total}
            detail="Tất cả bản ghi"
            color="green"
          />
          <StatCard
            label="ĐANG HIỂN THỊ"
            value={stats.published}
            detail="Đã công khai"
            color="blue"
          />
          <StatCard
            label="CÓ TỌA ĐỘ"
            value={stats.mapped}
            detail="Đủ vĩ độ, kinh độ"
            color="purple"
          />
          <StatCard
            label="ĐANG ẨN"
            value={stats.hidden}
            detail="Chưa công khai"
            color="orange"
          />
        </div>

        <div className="mb-5 rounded-2xl border border-[#dce8e0] bg-white p-3 shadow-sm sm:p-4">
          <p className="mb-3 text-[11px] font-bold text-[#587165]">
            TÌM KIẾM & LỌC ĐỊA DANH
          </p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_160px_160px]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#93a29b]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, địa chỉ, mô tả..."
                className={`${inputClass} pl-9`}
              />
            </div>

            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className={inputClass}
            >
              <option value="">Tất cả địa bàn</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={inputClass}
            >
              <option value="">Tất cả loại địa danh</option>
              {placeTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{!t.is_active ? " (ngừng hoạt động)" : ""}
                </option>
              ))}
            </select>

            <select
              value={filterPublished}
              onChange={(e) => setFilterPublished(e.target.value)}
              className={inputClass}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đang hiển thị</option>
              <option value="hidden">Đang ẩn</option>
            </select>

            <select
              value={filterCoordinates}
              onChange={(e) => setFilterCoordinates(e.target.value)}
              className={inputClass}
            >
              <option value="all">Tất cả tọa độ</option>
              <option value="has">Đã có tọa độ</option>
              <option value="missing">Thiếu tọa độ</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#dce8e0] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2ee] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-[#315747]">
                Danh sách địa danh
              </h2>
              <p className="mt-1 text-[10px] text-[#8b9b93]">
                Đang hiển thị {filteredPlaces.length} / {places.length} địa danh
              </p>
            </div>

            {(search ||
              filterWard ||
              filterType ||
              filterPublished !== "all" ||
              filterCoordinates !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterWard("");
                  setFilterType("");
                  setFilterPublished("all");
                  setFilterCoordinates("all");
                }}
                className="rounded-lg border border-[#dce8e0] px-3 py-2 text-[11px] font-semibold text-[#557264] hover:bg-[#f3f7f4]"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#87978e]">
              Đang tải dữ liệu...
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="p-12 text-center">
              <MapPin
                className="mx-auto text-[#b4c5bb]"
                size={30}
              />
              <p className="mt-2 text-sm font-semibold text-[#72857b]">
                Chưa có địa danh phù hợp
              </p>
              <p className="mt-1 text-xs text-[#87978e]">
                Hãy thử thay đổi từ khóa hoặc bộ lọc.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf2ee]">
              {filteredPlaces.map((p) => {
                const ward = wards.find((w) => w.id === p.ward_id);
                const type = placeTypes.find(
                  (t) => t.id === p.place_type_id,
                );
                const hasCoordinates =
                  p.latitude !== null && p.longitude !== null;

                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 px-4 py-4 hover:bg-[#f8fbf9] sm:px-5 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-[#315747]">
                          {p.name}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            p.is_published
                              ? "bg-[#e5f5eb] text-[#16834f]"
                              : "bg-[#f7eee0] text-[#a87527]"
                          }`}
                        >
                          {p.is_published ? "HIỂN THỊ" : "ĐANG ẨN"}
                        </span>

                        {!hasCoordinates && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600">
                            THIẾU TỌA ĐỘ
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {type && (
                          <span className="rounded-md bg-[#edf5f0] px-2 py-1 text-[10px] text-[#4f7462]">
                            {type.name}
                          </span>
                        )}
                        {ward && (
                          <span className="rounded-md bg-[#f2f5f3] px-2 py-1 text-[10px] text-[#61786c]">
                            {ward.name}
                          </span>
                        )}
                        {p.address && (
                          <span className="px-1 py-1 text-[10px] text-[#87978e]">
                            {p.address}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#87978e]">
                        <span>
                          Ảnh: {p.cover_image ? "Đã có" : "Chưa có"}
                        </span>
                        <span>
                          Mô tả: {p.short_description ? "Đã có" : "Chưa có"}
                        </span>
                        <span>
                          VR360: {p.vr360_url ? "Đã có" : "Chưa có"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end md:self-center">
                      <button
                        onClick={() => void togglePublished(p)}
                        className="rounded-lg p-2 text-[#71877b] hover:bg-[#edf7f1] hover:text-[#087b4c]"
                        title={p.is_published ? "Ẩn địa danh" : "Công khai địa danh"}
                        aria-label={p.is_published ? "Ẩn địa danh" : "Công khai địa danh"}
                      >
                        {p.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>

                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-[#71877b] hover:bg-[#edf5f0] hover:text-[#087b4c]"
                        title="Chỉnh sửa"
                        aria-label="Chỉnh sửa địa danh"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => void deletePlace(p)}
                        className="rounded-lg p-2 text-[#71877b] hover:bg-[#fff0ee] hover:text-[#c34f45]"
                        title="Xóa"
                        aria-label="Xóa địa danh"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#19362a]/40 p-3 backdrop-blur-[2px] md:p-6">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#f3f7f4] shadow-2xl">
            <div className="sticky top-0 z-40 flex items-center justify-between rounded-t-3xl border-b border-[#dce8e0] bg-white px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-[#087b4c]">
                  {editingId ? "Chỉnh sửa địa danh" : "Thêm địa danh mới"}
                </h2>
                <p className="mt-0.5 text-[10px] text-[#87978e]">
                  Quản lý thông tin địa danh trên bản đồ số
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-[#72857b] hover:bg-[#eef3ef]"
                aria-label="Đóng biểu mẫu"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-3 sm:p-5">
              <Section title="01 · Thông tin cơ bản">
                <Field label="Tên địa danh" required>
                  <input
                    value={form.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateField("name", value);
                      if (!editingId) {
                        updateField("slug", makeSlug(value));
                      }
                    }}
                    placeholder="Ví dụ: Ga Đà Lạt"
                    className={inputClass}
                  />
                </Field>

                <Field label="Loại địa danh">
                  <select
                    value={form.place_type_id}
                    onChange={(e) =>
                      updateField("place_type_id", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">-- Chọn loại địa danh --</option>
                    {placeTypes
                      .filter((t) => t.is_active || t.id === form.place_type_id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {!t.is_active ? " (ngừng hoạt động)" : ""}
                        </option>
                      ))}
                  </select>
                </Field>

                <Field label="Slug">
                  <input
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    placeholder="ga-da-lat"
                    className={inputClass}
                  />
                </Field>

                <Field label="Thứ tự hiển thị">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => updateField("sort_order", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </Section>

              <Section title="02 · Địa bàn & vị trí">
                <Field label="Xã / phường / đặc khu" required>
                  <div className="relative">
                    <div className="relative">
                      <MapPin
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5d91b2]"
                      />

                      <input
                        value={
                          form.ward_id
                            ? selectedWard?.name || ""
                            : wardSearch
                        }
                        onChange={(e) => {
                          setWardSearch(e.target.value);
                          updateField("ward_id", "");
                          setWardOpen(true);
                        }}
                        onFocus={() => setWardOpen(true)}
                        placeholder="Nhập tên địa bàn để tìm..."
                        className={`${inputClass} pl-9 pr-10`}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (form.ward_id) {
                            updateField("ward_id", "");
                            setWardSearch("");
                            setWardOpen(true);
                          } else {
                            setWardOpen(!wardOpen);
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#789087]"
                        aria-label="Chọn địa bàn"
                      >
                        {form.ward_id ? <X size={15} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {wardOpen && !form.ward_id && (
                      <>
                        <button
                          aria-label="Đóng danh sách địa bàn"
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={() => setWardOpen(false)}
                        />

                        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-[#cbdde9] bg-white p-1.5 shadow-xl">
                          {filteredWards.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                updateField("ward_id", w.id);
                                setWardSearch("");
                                setWardOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-[#edf6f9]"
                            >
                              <MapPin size={14} className="text-[#5d91b2]" />
                              <span className="text-xs font-semibold">
                                {w.name}
                              </span>
                              <span className="ml-auto text-[9px] text-[#788991]">
                                {w.type || ""}
                              </span>
                            </button>
                          ))}

                          {filteredWards.length === 0 && (
                            <p className="p-4 text-center text-xs">
                              Không tìm thấy địa bàn
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {selectedWard && (
                    <p className="mt-2 text-[10px] text-[#4d7894]">
                      ✓ Đã chọn: <b>{selectedWard.name}</b>
                    </p>
                  )}
                </Field>

                <Field label="Địa chỉ">
                  <input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Địa chỉ cụ thể"
                    className={inputClass}
                  />
                </Field>

                <Field label="Vĩ độ (Latitude)">
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => updateField("latitude", e.target.value)}
                    placeholder="11.9446"
                    className={inputClass}
                  />
                </Field>

                <Field label="Kinh độ (Longitude)">
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => updateField("longitude", e.target.value)}
                    placeholder="108.4583"
                    className={inputClass}
                  />
                </Field>

                <div className="md:col-span-2 rounded-xl border border-[#dce8e0] bg-[#f7faf8] p-3 text-[11px] leading-5 text-[#61786c]">
                  <b>Lưu ý:</b> Để địa danh được định vị trên bản đồ, cần nhập
                  đủ cả vĩ độ và kinh độ. Vĩ độ nằm trong khoảng -90 đến 90;
                  kinh độ nằm trong khoảng -180 đến 180.
                </div>
              </Section>

              <Section title="03 · Nội dung & lịch sử">
                <Field label="Mô tả ngắn">
                  <textarea
                    value={form.short_description}
                    onChange={(e) =>
                      updateField("short_description", e.target.value)
                    }
                    rows={3}
                    placeholder="Nội dung ngắn hiển thị trên thẻ địa danh..."
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                <Field label="Nội dung chi tiết / lịch sử">
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    rows={7}
                    placeholder="Lịch sử hình thành, sự kiện, nhân vật, giá trị..."
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                <Field label="Thời kỳ lịch sử">
                  <input
                    value={form.historical_period}
                    onChange={(e) =>
                      updateField("historical_period", e.target.value)
                    }
                    placeholder="Ví dụ: 1945–1975"
                    className={inputClass}
                  />
                </Field>

                <Field label="Xếp hạng / công nhận">
                  <input
                    value={form.recognition}
                    onChange={(e) => updateField("recognition", e.target.value)}
                    placeholder="Ví dụ: Di tích cấp quốc gia"
                    className={inputClass}
                  />
                </Field>

                <Field label="Nguồn tư liệu">
                  <input
                    value={form.source}
                    onChange={(e) => updateField("source", e.target.value)}
                    placeholder="Nguồn thông tin, tài liệu tham khảo"
                    className={inputClass}
                  />
                </Field>
              </Section>

              <Section title="04 · Tư liệu số">
                <Field label="URL ảnh đại diện">
                  <input
                    value={form.cover_image}
                    onChange={(e) => updateField("cover_image", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                <Field label="URL VR360">
                  <input
                    value={form.vr360_url}
                    onChange={(e) => updateField("vr360_url", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                <Field label="URL âm thanh">
                  <input
                    value={form.audio_url}
                    onChange={(e) => updateField("audio_url", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                <Field label="URL video">
                  <input
                    value={form.video_url}
                    onChange={(e) => updateField("video_url", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                {form.cover_image && isValidHttpUrl(form.cover_image) && (
                  <div className="md:col-span-2">
                    <p className="mb-2 text-[11px] font-semibold text-[#536c60]">
                      Xem trước ảnh đại diện
                    </p>
                    <img
                      src={form.cover_image}
                      alt="Xem trước ảnh địa danh"
                      className="max-h-56 w-full rounded-xl border border-[#dce8e0] object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </Section>

              <section className="rounded-2xl border border-[#d8e5dd] bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#315747]">
                      Trạng thái hiển thị
                    </h3>
                    <p className="mt-1 text-[10px] leading-5 text-[#87978e]">
                      Khi bật, địa danh được đánh dấu công khai. Để hiển thị
                      đúng vị trí trên bản đồ, địa danh cần có tọa độ hợp lệ.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_published}
                    onClick={() =>
                      updateField("is_published", !form.is_published)
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${
                      form.is_published ? "bg-[#15945b]" : "bg-[#aebbb4]"
                    }`}
                  >
                    <span
                      className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                        form.is_published ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-3xl border-t border-[#dce8e0] bg-white px-4 py-4 sm:px-5">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-xl border border-[#d5e1da] px-4 py-2.5 text-xs font-bold text-[#687b71] hover:bg-[#f3f7f4] disabled:opacity-50 sm:px-5"
              >
                Hủy
              </button>

              <button
                onClick={() => void savePlace()}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#087b4c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#06683f] disabled:opacity-60 sm:px-6"
              >
                <Check size={15} />
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "Thêm địa danh"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          router.replace("/admin/login");
          return;
        }

        const { data: admin, error: adminError } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (adminError || !admin) {
          await supabase.auth.signOut();
          if (active) router.replace("/admin/login");
          return;
        }

        setReady(true);
      } catch (error) {
        console.error("Lỗi xác thực quyền quản trị:", error);
        await supabase.auth.signOut();

        if (active) router.replace("/admin/login");
      }
    }

    void verifyAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (active) setReady(false);
        router.replace("/admin/login");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f4]">
        <div className="rounded-2xl border border-[#dce8e0] bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#dce8e0] border-t-[#087b4c]" />
          <p className="text-sm font-semibold text-[#315747]">
            Đang xác thực quyền quản trị...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-5">
        <span className="text-xs font-semibold text-green-800 sm:text-sm">
          QUẢN TRỊ BẢN ĐỒ SỐ LÂM ĐỒNG
        </span>

        <button
          onClick={() => void handleLogout()}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-gray-100 sm:px-4 sm:text-sm"
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>

      <AdminContent />
    </div>
  );
}