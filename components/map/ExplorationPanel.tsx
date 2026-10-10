
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Place = {
  id: string;
  name: string;
  slug?: string | null;
  place_type_id?: string | null;
  ward_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  short_description?: string | null;
  description?: string | null;
  cover_image?: string | null;
  vr360_url?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
  historical_period?: string | null;
  recognition?: string | null;
  source?: string | null;
  is_published?: boolean;
};

type PlacePreview = {
  id?: string;
  slug?: string;
  name?: string;
  summary?: string;
  short_description?: string;
  description?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  image?: string;
  cover_image?: string;
  vr360_url?: string;
  audio_url?: string;
  video_url?: string;
};

type PlaceType = {
  id: string;
  name: string;
};

export default function ExplorationPanel() {
  const [place, setPlace] = useState<Place | null>(null);
  const [preview, setPreview] = useState<PlacePreview | null>(null);
  const [placeType, setPlaceType] = useState("");
  const [wardName, setWardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPlace = useCallback(async (detail: PlacePreview) => {
    setLoading(true);
    setError("");
    setPlace(null);
    setPreview(detail);
    setPlaceType("");
    setWardName("");

    try {
      let record: Place | null = null;

      // Ưu tiên tìm bằng slug; chỉ truy vấn ID khi ID có định dạng UUID.
      const slug = detail.slug;
      const id = detail.id;

      if (slug) {
        const result = await supabase
          .from("places")
          .select(
            "id,name,slug,place_type_id,ward_id,address,latitude,longitude,short_description,description,cover_image,vr360_url,audio_url,video_url,historical_period,recognition,source,is_published"
          )
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle();

        if (result.error) throw result.error;
        record = result.data as Place | null;
      }

      if (!record && id && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) {
        const result = await supabase
          .from("places")
          .select(
            "id,name,slug,place_type_id,ward_id,address,latitude,longitude,short_description,description,cover_image,vr360_url,audio_url,video_url,historical_period,recognition,source,is_published"
          )
          .eq("id", id)
          .eq("is_published", true)
          .maybeSingle();

        if (result.error) throw result.error;
        record = result.data as Place | null;
      }

      if (record) {
        setPlace(record);
        setPreview(null);

        if (record.place_type_id) {
          const result = await supabase
            .from("place_types")
            .select("id,name")
            .eq("id", record.place_type_id)
            .maybeSingle();

          if (!result.error && result.data) {
            setPlaceType((result.data as PlaceType).name);
          }
        }

        if (record.ward_id) {
          const result = await supabase
            .from("wards")
            .select("id,name")
            .eq("id", record.ward_id)
            .maybeSingle();

          if (!result.error && result.data) {
            setWardName(result.data.name);
          }
        }
      } else {
        // Chưa có bản ghi xuất bản tương ứng: chỉ hiển thị dữ liệu từ sự kiện bản đồ.
        setPreview(detail);
      }
    } catch (err) {
      console.error("Không tải được hồ sơ địa danh:", err);
      setError("Chưa tải được đầy đủ thông tin địa danh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onPlaceSelected = (event: Event) => {
      const customEvent = event as CustomEvent<PlacePreview>;
      if (customEvent.detail) {
        void loadPlace(customEvent.detail);
      }
    };

    const onPlaceCleared = () => {
      setPlace(null);
      setPreview(null);
      setPlaceType("");
      setWardName("");
      setError("");
    };

    window.addEventListener("lamdong:place-selected", onPlaceSelected);
    window.addEventListener("lamdong:ward-cleared", onPlaceCleared);

    return () => {
      window.removeEventListener("lamdong:place-selected", onPlaceSelected);
      window.removeEventListener("lamdong:ward-cleared", onPlaceCleared);
    };
  }, [loadPlace]);

  const current = place ?? preview;
  const name = current?.name || "Địa danh đang chọn";
  const address = current?.address || "";
  const image = place?.cover_image || preview?.cover_image || preview?.image || "";
  const summary = place?.short_description || preview?.short_description || preview?.summary || "";
  const description = place?.description || preview?.description || "";
  const latitude = place?.latitude ?? Number(preview?.latitude);
  const longitude = place?.longitude ?? Number(preview?.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
      : "";

  const media = [
    {
      label: "Trải nghiệm VR360",
      url: place?.vr360_url || preview?.vr360_url,
      icon: "◉",
    },
    {
      label: "Nghe câu chuyện",
      url: place?.audio_url || preview?.audio_url,
      icon: "♫",
    },
    {
      label: "Xem video",
      url: place?.video_url || preview?.video_url,
      icon: "▷",
    },
  ].filter((item) => item.url);

  return (
    <section
      id="chi-tiet-dia-danh"
      className="scroll-mt-24 bg-[#f5f8f3] px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
              Lâm Đồng – Bản giao hưởng xanh
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#183c2b] sm:text-3xl">
              Khám phá địa danh
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chọn một điểm trên bản đồ để xem hồ sơ, tìm hiểu câu chuyện và
              khám phá địa điểm đó.
            </p>
          </div>

          {current && (
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800">
              {place ? "Thông tin địa danh" : "Thông tin xem trước"}
            </span>
          )}
        </div>

        {loading && (
          <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center text-sm text-slate-600">
            Đang tải thông tin địa danh…
          </div>
        )}

        {!loading && !current && (
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-800">
              ⌖
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#183c2b]">
              Hãy chọn một địa danh trên bản đồ
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Thông tin của địa danh được chọn sẽ hiển thị tại đây. Khi chọn
              địa danh khác, nội dung sẽ tự động cập nhật.
            </p>
          </div>
        )}

        {!loading && current && (
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[240px] bg-[#e6eee4] lg:min-h-[420px]">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-emerald-900">
                    <span className="text-5xl">⌖</span>
                    <span className="mt-3 text-sm font-medium">
                      Chưa có hình ảnh cho địa danh này
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 pt-16 sm:p-6 sm:pt-20">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
                    {placeType || "Địa danh Lâm Đồng"}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                    {name}
                  </h3>
                  {wardName && (
                    <p className="mt-2 text-sm text-white/90">{wardName}</p>
                  )}
                </div>
              </div>

              <div className="p-5 sm:p-7 lg:p-8">
                {error && (
                  <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    {error}
                  </p>
                )}

                {summary && (
                  <p className="text-base font-medium leading-7 text-[#315442]">
                    {summary}
                  </p>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                    Thông tin địa điểm
                  </h4>

                  <div className="mt-4 space-y-4">
                    {address ? (
                      <div className="flex gap-3">
                        <span className="mt-0.5 text-lg">⌖</span>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            Địa chỉ
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-800">
                            {address}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Chưa cập nhật địa chỉ cụ thể.
                      </p>
                    )}

                    {hasCoordinates && (
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold">Tọa độ: </span>
                        {latitude}, {longitude}
                      </div>
                    )}

                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
                      >
                        Chỉ đường đến địa danh <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </div>

                {description && (
                  <div className="mt-7 border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                      Câu chuyện địa danh
                    </h4>
                    <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {description}
                    </div>
                  </div>
                )}

                {(place?.historical_period || place?.recognition) && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {place?.historical_period && (
                      <div className="rounded-xl bg-[#f5f8f3] p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Thời kỳ lịch sử
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#183c2b]">
                          {place.historical_period}
                        </p>
                      </div>
                    )}
                    {place?.recognition && (
                      <div className="rounded-xl bg-[#f5f8f3] p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Danh hiệu / công nhận
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#183c2b]">
                          {place.recognition}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {media.length > 0 && (
                  <div className="mt-7 border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                      Trải nghiệm khám phá
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {media.map((item) => (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
                        >
                          <span>{item.icon}</span>
                          {item.label}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!description && media.length === 0 && !address && (
                  <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Địa danh này chưa có đủ dữ liệu chi tiết. Cần bổ sung thông
                    tin trong chức năng quản lý địa danh để nội dung khám phá
                    được hiển thị đầy đủ.
                  </div>
                )}

                {place?.source && (
                  <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                    Nguồn thông tin: {place.source}
                  </p>
                )}

                {preview && !place && (
                  <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-amber-700">
                    Đây là thông tin xem trước từ điểm đánh dấu trên bản đồ;
                    chưa tìm thấy hồ sơ đã xuất bản tương ứng trong cơ sở dữ
                    liệu.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}