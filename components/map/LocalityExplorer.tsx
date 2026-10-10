
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Camera,
  Headphones,
  MapPin,
  Play,
  Rotate3D,
  Search,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type WardSelection = {
  name: string;
  type?: string;
  code?: string;
  dbId?: string;
};

type PlaceType = {
  id: string;
  name: string;
  sort_order?: number | null;
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

type MapPlaceEvent = {
  id?: string;
  name?: string;
  address?: string;
  summary?: string;
};

const PLACE_COLUMNS =
  "id,name,slug,place_type_id,ward_id,address,latitude,longitude,short_description,description,cover_image,vr360_url,audio_url,video_url,historical_period,recognition,source,sort_order";

export default function LocalityExplorer() {
  const [ward, setWard] = useState<WardSelection | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [types, setTypes] = useState<PlaceType[]>([]);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const placesRef = useRef<Place[]>([]);
  const wardRef = useRef<WardSelection | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    wardRef.current = ward;
  }, [ward]);

  useEffect(() => {
    async function loadTypes() {
      const { data, error: queryError } = await supabase
        .from("place_types")
        .select("id,name,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (queryError) {
        console.error("Không tải được loại địa danh:", queryError.message);
        return;
      }

      setTypes((data ?? []) as PlaceType[]);
    }

    async function loadWardPlaces(selected: WardSelection) {
      const requestId = ++requestRef.current;

      setWard(selected);
      wardRef.current = selected;
      setActivePlace(null);
      setPlaces([]);
      placesRef.current = [];
      setError("");
      setLoading(true);
      setSearch("");

      if (!selected.dbId) {
        setLoading(false);
        setError(
          "Chưa khớp được địa phương với dữ liệu quản trị. Kiểm tra mã xã/phường trong bảng wards."
        );
        return;
      }

      const { data, error: queryError } = await supabase
        .from("places")
        .select(PLACE_COLUMNS)
        .eq("ward_id", selected.dbId)
        .eq("is_published", true)
        .order("sort_order", { ascending: true });

      if (requestId !== requestRef.current) return;

      setLoading(false);

      if (queryError) {
        setError("Không tải được địa danh: " + queryError.message);
        return;
      }

      const rows = (data ?? []) as Place[];
      setPlaces(rows);
      placesRef.current = rows;
    }

    async function loadMapPlace(detail: MapPlaceEvent) {
      if (!detail?.id && !detail?.name) return;

      const existing = placesRef.current.find(
        (item) =>
          item.id === detail.id ||
          item.slug === detail.id ||
          item.name === detail.name
      );

      if (existing) {
        setActivePlace(existing);
        return;
      }

      const requestId = ++requestRef.current;
      setActivePlace(null);
      setError("Đang tìm hồ sơ địa danh trong dữ liệu quản trị…");

      let result: { data: unknown; error: { message: string } | null } = {
        data: null,
        error: null,
      };

      if (detail.id) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            detail.id
          );

        const query = supabase
          .from("places")
          .select(PLACE_COLUMNS)
          .eq(isUuid ? "id" : "slug", detail.id)
          .eq("is_published", true);

        result = await query.maybeSingle();
      }

      if (!result.data && detail.name) {
        let query = supabase
          .from("places")
          .select(PLACE_COLUMNS)
          .eq("name", detail.name)
          .eq("is_published", true);

        if (wardRef.current?.dbId) {
          query = query.eq("ward_id", wardRef.current.dbId);
        }

        result = await query.maybeSingle();
      }

      if (requestId !== requestRef.current) return;

      if (result.error) {
        setError("Không tải được hồ sơ địa danh: " + result.error.message);
        return;
      }

      if (!result.data) {
        setError(
          `“${detail.name ?? "Địa danh này"}” chưa tìm thấy hồ sơ đã công bố trong Supabase.`
        );
        return;
      }

      const place = result.data as Place;
      setActivePlace(place);

      if (place.ward_id && place.ward_id !== wardRef.current?.dbId) {
        const { data: wardData } = await supabase
          .from("wards")
          .select("id,code,name,type")
          .eq("id", place.ward_id)
          .maybeSingle();

        if (wardData && requestId === requestRef.current) {
          const nextWard: WardSelection = {
            name: wardData.name,
            type: wardData.type,
            code: wardData.code,
            dbId: wardData.id,
          };

          setWard(nextWard);
          wardRef.current = nextWard;

          const { data: wardPlaces } = await supabase
            .from("places")
            .select(PLACE_COLUMNS)
            .eq("ward_id", wardData.id)
            .eq("is_published", true)
            .order("sort_order", { ascending: true });

          if (requestId === requestRef.current && wardPlaces) {
            setPlaces(wardPlaces as Place[]);
            placesRef.current = wardPlaces as Place[];
          }
        }
      }

      setError("");
    }

    const onWardSelected = (event: Event) => {
      const customEvent = event as CustomEvent<WardSelection>;
      if (customEvent.detail) void loadWardPlaces(customEvent.detail);
    };

    const onWardCleared = () => {
      requestRef.current++;
      setWard(null);
      wardRef.current = null;
      setPlaces([]);
      placesRef.current = [];
      setActivePlace(null);
      setError("");
      setLoading(false);
      setSearch("");
    };

    const onPlaceSelected = (event: Event) => {
      const customEvent = event as CustomEvent<MapPlaceEvent>;
      if (customEvent.detail) void loadMapPlace(customEvent.detail);
    };

    void loadTypes();

    window.addEventListener("lamdong:ward-selected", onWardSelected);
    window.addEventListener("lamdong:ward-cleared", onWardCleared);
    window.addEventListener("lamdong:place-selected", onPlaceSelected);

    return () => {
      window.removeEventListener("lamdong:ward-selected", onWardSelected);
      window.removeEventListener("lamdong:ward-cleared", onWardCleared);
      window.removeEventListener("lamdong:place-selected", onPlaceSelected);
    };
  }, []);

  const filteredPlaces = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return places;

    return places.filter((place) =>
      [
        place.name,
        place.address,
        place.short_description,
        place.description,
        place.historical_period,
        place.recognition,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword)
    );
  }, [places, search]);

  const activeType = activePlace
    ? types.find((item) => item.id === activePlace.place_type_id)?.name
    : "";

  function openPlace(place: Place) {
    setActivePlace(place);
    setError("");

    window.setTimeout(() => {
      document
        .getElementById("chi-tiet-dia-danh")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function openMap(place: Place) {
    if (place.latitude == null || place.longitude == null) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      id="chi-tiet-dia-danh"
      className="scroll-mt-24 bg-[#f6f8f3] px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
              Lâm Đồng – Bản giao hưởng xanh
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[#173f30] sm:text-4xl">
              {ward ? `Không gian khám phá ${ward.name}` : "Khám phá từng vùng đất"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {ward
                ? `Thông tin địa danh của ${ward.name} được hiển thị từ dữ liệu đã công bố trên hệ thống.`
                : "Chọn một xã, phường hoặc đặc khu trên bản đồ phía trên để xem địa danh, câu chuyện và tư liệu của địa phương."}
            </p>
          </div>

          {ward && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("lamdong:ward-cleared"));
              }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              <X size={16} />
              Bỏ chọn địa phương
            </button>
          )}
        </div>

        {!ward ? (
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-white px-6 py-12 text-center sm:px-12">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <MapPin size={27} />
            </div>
            <h3 className="text-lg font-bold text-[#173f30]">
              Bắt đầu từ bản đồ
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Bấm vào địa phương trên bản đồ. Khu vực này sẽ tự chuyển sang nội
              dung của địa phương vừa chọn, không cần rời khỏi trang chủ.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-white p-5">
                <p className="text-sm text-slate-500">Địa phương đang xem</p>
                <p className="mt-2 text-xl font-bold text-[#173f30]">{ward.name}</p>
                {ward.type && (
                  <p className="mt-1 text-sm text-slate-500">{ward.type}</p>
                )}
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-5">
                <p className="text-sm text-slate-500">Địa danh đã công bố</p>
                <p className="mt-2 text-3xl font-bold text-emerald-800">
                  {loading ? "…" : places.length}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Lấy từ dữ liệu quản trị
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-5">
                <label
                  htmlFor="locality-search"
                  className="mb-2 block text-sm font-medium text-slate-600"
                >
                  Tìm trong địa phương
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                  <Search size={17} className="shrink-0 text-slate-400" />
                  <input
                    id="locality-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tên địa danh, địa chỉ…"
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            {loading && (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-500">
                Đang tải dữ liệu địa phương…
              </p>
            )}

            {error && (
              <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                {error}
              </p>
            )}

            {activePlace && (
              <article className="mb-10 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
                <div className="grid lg:grid-cols-2">
                  <div className="min-h-64 bg-[#e7eee5]">
                    {activePlace.cover_image ? (
                      <img
                        src={activePlace.cover_image}
                        alt={activePlace.name}
                        className="h-full max-h-[460px] min-h-64 w-full object-cover"
                      />
                    ) : (
                      <div className="flex min-h-64 h-full flex-col items-center justify-center gap-3 text-emerald-800">
                        <Camera size={36} />
                        <span className="text-sm">Chưa có ảnh đại diện</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 sm:p-8 lg:p-10">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                      {activeType || "Địa danh"}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold text-[#173f30] sm:text-3xl">
                      {activePlace.name}
                    </h3>

                    {activePlace.address && (
                      <p className="mt-4 flex gap-2 text-sm leading-6 text-slate-600">
                        <MapPin size={18} className="mt-1 shrink-0" />
                        {activePlace.address}
                      </p>
                    )}

                    {activePlace.short_description && (
                      <p className="mt-5 text-base font-medium leading-7 text-slate-700">
                        {activePlace.short_description}
                      </p>
                    )}

                    {activePlace.description && (
                      <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                        {activePlace.description}
                      </div>
                    )}

                    {(activePlace.historical_period || activePlace.recognition) && (
                      <div className="mt-5 space-y-2 rounded-2xl bg-[#f6f8f3] p-4 text-sm leading-6 text-slate-700">
                        {activePlace.historical_period && (
                          <p>
                            <strong>Thời kỳ:</strong>{" "}
                            {activePlace.historical_period}
                          </p>
                        )}
                        {activePlace.recognition && (
                          <p>
                            <strong>Công nhận, xếp hạng:</strong>{" "}
                            {activePlace.recognition}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2">
                      {activePlace.vr360_url && (
                        <a
                          href={activePlace.vr360_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
                        >
                          <Rotate3D size={16} /> Xem VR360
                        </a>
                      )}
                      {activePlace.audio_url && (
                        <a
                          href={activePlace.audio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                        >
                          <Headphones size={16} /> Nghe tư liệu
                        </a>
                      )}
                      {activePlace.video_url && (
                        <a
                          href={activePlace.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                        >
                          <Play size={16} /> Xem video
                        </a>
                      )}
                      {activePlace.latitude != null &&
                        activePlace.longitude != null && (
                          <button
                            onClick={() => openMap(activePlace)}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
                          >
                            <MapPin size={16} /> Chỉ đường
                          </button>
                        )}
                    </div>

                    {activePlace.source && (
                      <p className="mt-5 text-xs leading-5 text-slate-400">
                        Nguồn tư liệu: {activePlace.source}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            )}

            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[#173f30]">
                  Địa danh và tư liệu
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Chọn một mục để xem hồ sơ chi tiết.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-900">
                {filteredPlaces.length} mục
              </span>
            </div>

            {!loading && filteredPlaces.length === 0 && !error && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <BookOpen className="mx-auto text-emerald-700" size={28} />
                <p className="mt-3 font-semibold text-[#173f30]">
                  Chưa có địa danh phù hợp
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {search
                    ? "Thử từ khóa khác."
                    : "Chưa có hồ sơ được công bố cho địa phương này. Nội dung sẽ xuất hiện khi quản trị viên bổ sung dữ liệu."}
                </p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlaces.map((place) => {
                const typeName =
                  types.find((item) => item.id === place.place_type_id)?.name ??
                  "Địa danh";

                return (
                  <button
                    key={place.id}
                    onClick={() => openPlace(place)}
                    className={`group overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-1 hover:shadow-lg ${
                      activePlace?.id === place.id
                        ? "border-emerald-600 ring-1 ring-emerald-600"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="h-48 overflow-hidden bg-[#e7eee5]">
                      {place.cover_image ? (
                        <img
                          src={place.cover_image}
                          alt={place.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-emerald-800">
                          <Camera size={30} />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        {typeName}
                      </p>
                      <h4 className="mt-2 text-lg font-bold text-[#173f30]">
                        {place.name}
                      </h4>
                      {place.short_description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                          {place.short_description}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        Xem hồ sơ <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {types.length > 0 && (
              <div className="mt-10 border-t border-emerald-100 pt-6">
                <h3 className="mb-4 text-lg font-bold text-[#173f30]">
                  Các nhóm nội dung
                </h3>
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => {
                    const count = places.filter(
                      (place) => place.place_type_id === type.id
                    ).length;

                    return (
                      <span
                        key={type.id}
                        className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm text-slate-700"
                      >
                        {type.name} <strong className="text-emerald-800">({count})</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}