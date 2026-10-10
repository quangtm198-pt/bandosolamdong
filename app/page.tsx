
"use client";

import {
  ArrowRight,
  Compass,
  History,
  Map,
  MapPin,
  Menu,
  Mountain,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import LamDongMap from "@/components/map/LamDongMap";
import ExplorationPanel from "@/components/map/ExplorationPanel";
import { supabase } from "@/lib/supabase";

type PlaceRow = {
  id: string;
  name: string;
  slug?: string | null;
  place_type_id?: string | null;
  ward_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  short_description?: string | null;
  cover_image?: string | null;
  is_published: boolean;
  sort_order: number;
};

type LookupRow = {
  id: string;
  name: string;
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [placeTypes, setPlaceTypes] = useState<LookupRow[]>([]);
  const [wards, setWards] = useState<LookupRow[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoadingPlaces(true);
      setLoadError("");

      const [placeResult, typeResult, wardResult] = await Promise.all([
        supabase
          .from("places")
          .select(
            "id,name,slug,place_type_id,ward_id,address,latitude,longitude,short_description,cover_image,is_published,sort_order"
          )
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("place_types")
          .select("id,name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("wards")
          .select("id,name")
          .eq("province_code", "68")
          .order("name", { ascending: true }),
      ]);

      if (!mounted) return;

      if (placeResult.error) {
        setLoadError("Chưa tải được danh sách địa danh.");
      } else {
        setPlaces((placeResult.data ?? []) as PlaceRow[]);
      }

      if (!typeResult.error) {
        setPlaceTypes((typeResult.data ?? []) as LookupRow[]);
      }

      if (!wardResult.error) {
        setWards((wardResult.data ?? []) as LookupRow[]);
      }

      setLoadingPlaces(false);
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPlaces = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");

    return places.filter((place) => {
      const typeName =
        placeTypes.find((item) => item.id === place.place_type_id)?.name ?? "";
      const wardName =
        wards.find((item) => item.id === place.ward_id)?.name ?? "";

      const matchesQuery =
        !query ||
        place.name.toLocaleLowerCase("vi").includes(query) ||
        typeName.toLocaleLowerCase("vi").includes(query) ||
        wardName.toLocaleLowerCase("vi").includes(query) ||
        (place.address ?? "").toLocaleLowerCase("vi").includes(query);

      return (
        matchesQuery &&
        (!selectedType || place.place_type_id === selectedType) &&
        (!selectedWard || place.ward_id === selectedWard)
      );
    });
  }, [places, placeTypes, wards, searchQuery, selectedType, selectedWard]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const openPlaceFromSearch = (place: PlaceRow) => {
    setSearchOpen(false);

    window.dispatchEvent(
      new CustomEvent("lamdong:place-selected", {
        detail: {
          id: place.id,
          slug: place.slug,
          name: place.name,
          summary: place.short_description,
          short_description: place.short_description,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          image: place.cover_image,
          cover_image: place.cover_image,
        },
      })
    );

    window.setTimeout(() => scrollTo("chi-tiet-dia-danh"), 100);
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSelectedType("");
    setSelectedWard("");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f8f5] text-[#123d2b]">
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-[1500px] px-3 pt-3 sm:px-5 lg:px-8">
          <div className="flex h-[58px] items-center rounded-2xl border border-white/60 bg-white/90 px-3 shadow-lg backdrop-blur-xl sm:h-16 sm:px-4">
            <button
              onClick={() => scrollTo("ban-do")}
              className="flex items-center gap-2.5 text-left"
              aria-label="Về bản đồ Lâm Đồng"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#dce9df] sm:h-11 sm:w-11">
                <img
                  src="/logo-doan.png"
                  alt="Đoàn TNCS Hồ Chí Minh"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-wider text-[#087043] sm:text-base">
                  LÂM ĐỒNG
                </div>
                <div className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-[#789087] sm:block">
                  Bản giao hưởng xanh
                </div>
              </div>
            </button>

            <nav className="ml-auto hidden items-center gap-1 lg:flex">
              <HeaderItem
                icon={<Map size={16} />}
                label="Bản đồ"
                active
                onClick={() => scrollTo("ban-do")}
              />
              <HeaderItem
                icon={<Mountain size={16} />}
                label="Địa danh"
                onClick={() => scrollTo("chi-tiet-dia-danh")}
              />
              <HeaderItem
                icon={<History size={16} />}
                label="Hành trình về nguồn"
                onClick={() => window.location.assign("/hanh-trinh-ve-nguon")}
              />
            </nav>

            <button
              onClick={() => setSearchOpen(true)}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7f1] text-[#087043] transition hover:bg-[#e0f1e7] lg:ml-2"
              aria-label="Tìm kiếm địa danh"
            >
              <Search size={19} />
            </button>

            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="ml-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7f1] text-[#087043] lg:hidden"
              aria-label="Mở menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-white bg-white p-2 shadow-2xl lg:hidden">
            <MobileItem
              icon={<Map size={18} />}
              label="Bản đồ Lâm Đồng"
              onClick={() => {
                setMenuOpen(false);
                scrollTo("ban-do");
              }}
            />
            <MobileItem
              icon={<Mountain size={18} />}
              label="Thông tin địa danh"
              onClick={() => {
                setMenuOpen(false);
                scrollTo("chi-tiet-dia-danh");
              }}
            />
            <MobileItem
              icon={<History size={18} />}
              label="Hành trình về nguồn"
              onClick={() => {
                setMenuOpen(false);
                window.location.assign("/hanh-trinh-ve-nguon");
              }}
            />
            <MobileItem
              icon={<Search size={18} />}
              label="Tìm địa danh"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
            />
          </div>
        )}
      </header>

      {/* GIỚI THIỆU NGẮN VÀ BẢN ĐỒ */}
      <section className="relative overflow-hidden pt-[90px]">
        <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#78d69e]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-[#f6ce62]/20 blur-3xl" />

        <div className="relative mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 pb-6 lg:grid-cols-[0.72fr_1.5fr] lg:items-center lg:pb-8">
            <div className="py-4 lg:py-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cce7d6] bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#087043]">
                <span className="h-2 w-2 rounded-full bg-[#e7b600]" />
                Bản đồ số Lâm Đồng
              </div>

              <h1 className="text-[42px] font-black leading-[0.98] tracking-[-0.045em] text-[#0b5435] sm:text-[58px] lg:text-[66px]">
                Chạm vào
                <br />
                <span className="bg-gradient-to-r from-[#087b4c] via-[#11a96d] to-[#c99b00] bg-clip-text text-transparent">
                  Lâm Đồng.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#60796d] sm:text-base">
                Khám phá địa chỉ đỏ, di tích lịch sử, văn hóa, thiên nhiên và
                con người qua từng địa danh trên bản đồ số.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => scrollTo("ban-do")}
                  className="flex items-center gap-2 rounded-full bg-[#087b4c] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#07673f]"
                >
                  <Compass size={18} />
                  Mở bản đồ
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-[#cde2d4] bg-white px-5 py-3 text-sm font-bold text-[#17603f] transition hover:bg-[#eef7f1]"
                >
                  <Search size={16} />
                  Tìm địa danh
                </button>
              </div>

              <div className="mt-7 flex items-center gap-5 border-t border-[#dce9df] pt-5">
                <HeroStat value="124" label="xã, phường, đặc khu" />
                <div className="h-8 w-px bg-[#d8e6dc]" />
                <HeroStat
                  value={loadingPlaces ? "…" : String(places.length)}
                  label="địa danh đã xuất bản"
                />
              </div>

              {loadError && (
                <p className="mt-3 text-xs text-amber-700">{loadError}</p>
              )}
            </div>

            <div id="ban-do" className="scroll-mt-24">
              <div className="relative h-[520px] overflow-hidden rounded-[26px] border-[5px] border-white bg-[#dfeee4] shadow-[0_25px_70px_rgba(24,75,48,0.18)] sm:h-[620px] lg:h-[700px]">
                <LamDongMap />
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-center text-[10px] text-[#81968b]">
                <MapPin size={13} />
                Chọn một địa danh trên bản đồ để xem thông tin chi tiết bên dưới
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HỒ SƠ ĐỊA DANH ĐƯỢC CHỌN */}
      <ExplorationPanel />

      {/* CHÂN TRANG */}
      <footer className="mt-8 border-t border-[#dce9df] bg-white px-4 py-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 text-xs text-[#789087] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo-doan.png"
              alt="Đoàn TNCS Hồ Chí Minh"
              className="h-7 w-7 object-contain"
            />
            <span>
              <strong className="text-[#17603f]">LÂM ĐỒNG</strong>
              {" · "}Bản giao hưởng xanh
            </span>
          </div>
          <span>Ngàn Hoa · Biển Xanh · Đại Ngàn</span>
        </div>
      </footer>

      {/* TÌM KIẾM ĐỊA DANH */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-[#052e20]/50 px-4 pt-24 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#e1ebe4] px-5">
              <Search size={20} className="text-[#087043]" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm tên địa danh, di tích, địa chỉ đỏ..."
                className="h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#9aaaa2]"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-xl p-2 text-[#70877a] hover:bg-[#f0f6f2]"
                aria-label="Đóng tìm kiếm"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 border-b border-[#e1ebe4] px-5 py-4 sm:grid-cols-2">
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="h-11 rounded-xl border border-[#dce9df] bg-[#f7faf7] px-3 text-xs text-[#285b42] outline-none"
              >
                <option value="">Tất cả loại địa danh</option>
                {placeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedWard}
                onChange={(event) => setSelectedWard(event.target.value)}
                className="h-11 rounded-xl border border-[#dce9df] bg-[#f7faf7] px-3 text-xs text-[#285b42] outline-none"
              >
                <option value="">Tất cả xã/phường/đặc khu</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#91a198]">
                  Kết quả tìm kiếm
                </span>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("");
                    setSelectedWard("");
                  }}
                  className="text-xs font-semibold text-[#087043]"
                >
                  Xóa bộ lọc
                </button>
              </div>

              {loadingPlaces ? (
                <p className="py-5 text-center text-sm text-[#82958b]">
                  Đang tải dữ liệu địa danh…
                </p>
              ) : loadError ? (
                <p className="py-5 text-center text-sm text-amber-700">
                  {loadError}
                </p>
              ) : filteredPlaces.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#82958b]">
                  Không tìm thấy địa danh phù hợp.
                </p>
              ) : (
                <div className="max-h-[48vh] space-y-2 overflow-y-auto">
                  {filteredPlaces.map((place) => {
                    const typeName =
                      placeTypes.find(
                        (item) => item.id === place.place_type_id
                      )?.name ?? "Địa danh";
                    const wardName =
                      wards.find((item) => item.id === place.ward_id)?.name ??
                      "";

                    return (
                      <button
                        key={place.id}
                        onClick={() => openPlaceFromSearch(place)}
                        className="flex w-full items-start gap-3 rounded-xl border border-[#e1ebe4] p-3 text-left transition hover:bg-[#f0f7f2]"
                      >
                        {place.cover_image ? (
                          <img
                            src={place.cover_image}
                            alt=""
                            className="h-16 w-20 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-[#e8f5ed] text-[#087043]">
                            <MapPin size={22} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#145c3a]">
                            {place.name}
                          </div>
                          <div className="mt-1 text-[11px] text-[#72897e]">
                            {typeName}
                            {wardName ? ` · ${wardName}` : ""}
                          </div>
                          {place.short_description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#82958b]">
                              {place.short_description}
                            </p>
                          )}
                        </div>
                        <ArrowRight
                          size={16}
                          className="mt-1 shrink-0 text-[#087043]"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function HeaderItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-[#e8f5ed] text-[#087043]"
          : "text-[#607a6d] hover:bg-[#f1f7f3] hover:text-[#087043]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#416356] hover:bg-[#eff7f2]"
    >
      {icon}
      {label}
    </button>
  );
}

function HeroStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div>
      <div className="text-lg font-black text-[#087043]">{value}</div>
      <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#84978d]">
        {label}
      </div>
    </div>
  );
}