"use client";

import {
  ArrowLeft,
  ArrowRight,
  Compass,
  History,
  Landmark,
  Map,
  MapPin,
  Menu,
  Mountain,
  Play,
  Search,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import LamDongMap from "@/components/map/LamDongMap";

/* =========================================================
   NHỮNG MIỀN ĐẤT
   Sau này có thể nối trực tiếp với bản đồ
========================================================= */

const quickPlaces = [
  {
    name: "Ngàn Hoa",
    label: "Cao nguyên · lịch sử · văn hóa",
    emoji: "🌸",
  },
  {
    name: "Đại Ngàn",
    label: "Núi rừng · thiên nhiên · cộng đồng",
    emoji: "🌿",
  },
  {
    name: "Biển Xanh",
    label: "Biển · đảo · những miền duyên hải",
    emoji: "🌊",
  },
  {
    name: "Miền Di sản",
    label: "Di tích · ký ức · văn hóa",
    emoji: "🏛️",
  },
  {
    name: "Miền Cộng đồng",
    label: "Con người · dân tộc · đời sống",
    emoji: "🤝",
  },
  {
    name: "Miền Thiên nhiên",
    label: "Rừng · hồ · thác · cảnh quan",
    emoji: "🏔️",
  },
];

/* =========================================================
   TÌM KIẾM
========================================================= */

const searchSuggestions = [
  {
    label: "Địa chỉ đỏ",
    icon: History,
    color: "text-[#e84c3d]",
  },
  {
    label: "Danh thắng",
    icon: Mountain,
    color: "text-[#087c55]",
  },
  {
    label: "Di tích lịch sử",
    icon: Landmark,
    color: "text-[#a66a12]",
  },
  {
    label: "Du lịch biển",
    icon: Waves,
    color: "text-[#0784a3]",
  },
  {
    label: "Văn hóa dân tộc",
    icon: Sparkles,
    color: "text-[#d28b19]",
  },
  {
    label: "Về nguồn",
    icon: Compass,
    color: "text-[#087b4c]",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const placesRef = useRef<HTMLDivElement>(null);

  const scrollPlaces = (
    direction: "left" | "right"
  ) => {
    if (!placesRef.current) return;

    placesRef.current.scrollBy({
      left:
        direction === "right"
          ? 330
          : -330,
      behavior: "smooth",
    });
  };

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f8f5] text-[#123d2b]">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-[1500px] px-3 pt-3 sm:px-5 lg:px-8">
          <div className="flex h-[58px] items-center rounded-2xl border border-white/60 bg-white/85 px-3 shadow-[0_8px_35px_rgba(16,70,45,0.10)] backdrop-blur-xl sm:h-[64px] sm:px-4">

            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-[#dce9df] sm:h-11 sm:w-11">
                <img
                  src="/logo-doan.png"
                  alt="Đoàn TNCS Hồ Chí Minh"
                  className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                />
              </div>

              <div>
                <div className="text-[14px] font-extrabold tracking-[0.08em] text-[#087043] sm:text-[16px]">
                  LÂM ĐỒNG
                </div>

                <div className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-[#789087] sm:block">
                  Bản giao hưởng xanh
                </div>
              </div>
            </div>

            <nav className="ml-auto hidden items-center gap-1 lg:flex">
              <HeaderItem
                icon={<Map size={16} />}
                label="Bản đồ"
                active
                iconClass="text-[#087c55]"
                onClick={() => scrollTo("ban-do")}
              />

              <HeaderItem
                icon={<History size={16} />}
                label="Địa chỉ đỏ"
                iconClass="text-[#e84c3d]"
                onClick={() => scrollTo("hanh-trinh")}
              />

              <HeaderItem
                icon={<Mountain size={16} />}
                label="Khám phá"
                iconClass="text-[#087c55]"
                onClick={() => scrollTo("mien-dat")}
              />

              <HeaderItem
                icon={<Sparkles size={16} />}
                label="Văn hóa"
                iconClass="text-[#d28b19]"
                onClick={() => scrollTo("mien-dat")}
              />
            </nav>

            <button
              onClick={() => setSearchOpen(true)}
              className="ml-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#eef7f1] text-[#087043] transition hover:scale-105 hover:bg-[#e0f1e7] lg:ml-2"
              aria-label="Tìm kiếm"
            >
              <Search size={19} />
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="ml-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#eef7f1] text-[#087043] lg:hidden"
              aria-label="Mở menu"
            >
              {menuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-white bg-white p-2 shadow-2xl lg:hidden">

            <MobileItem
              icon={<Map size={18} />}
              label="Bản đồ Lâm Đồng"
              iconClass="text-[#087c55]"
              onClick={() => {
                setMenuOpen(false);
                scrollTo("ban-do");
              }}
            />

            <MobileItem
              icon={<History size={18} />}
              label="Hành trình về nguồn"
              iconClass="text-[#e84c3d]"
              onClick={() => {
                setMenuOpen(false);
                scrollTo("hanh-trinh");
              }}
            />

            <MobileItem
              icon={<Mountain size={18} />}
              label="Những miền đất"
              iconClass="text-[#087c55]"
              onClick={() => {
                setMenuOpen(false);
                scrollTo("mien-dat");
              }}
            />

            <MobileItem
              icon={<Sparkles size={18} />}
              label="Văn hóa"
              iconClass="text-[#d28b19]"
              onClick={() => {
                setMenuOpen(false);
                scrollTo("mien-dat");
              }}
            />

          </div>
        )}
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative min-h-[820px] overflow-hidden pt-[90px]">

        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#78d69e]/20 blur-3xl" />

        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-[#f6ce62]/20 blur-3xl" />

        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">

          <div className="grid gap-6 lg:grid-cols-[0.78fr_1.5fr] lg:items-center">

            {/* =================================================
                HERO TEXT
            ================================================== */}

            <div className="relative z-10 py-5 lg:py-12">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cce7d6] bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#087043] shadow-sm backdrop-blur">

                <span className="h-2 w-2 animate-pulse rounded-full bg-[#e7b600]" />

                Một Lâm Đồng mới

              </div>

              <h1 className="max-w-[650px] text-[42px] font-black leading-[0.98] tracking-[-0.045em] text-[#0b5435] sm:text-[58px] lg:text-[68px]">

                Chạm vào
                <br />

                <span className="bg-gradient-to-r from-[#087b4c] via-[#11a96d] to-[#e0a900] bg-clip-text text-transparent">
                  Lâm Đồng.
                </span>

              </h1>

              <p className="mt-5 max-w-[560px] text-[15px] leading-7 text-[#60796d] sm:text-[17px]">
                Một không gian số để người trẻ
                khám phá lịch sử, văn hóa, con
                người, thiên nhiên và những điều
                tuyệt vời đang tạo nên Lâm Đồng
                hôm nay.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">

                <button
                  onClick={() => scrollTo("ban-do")}
                  className="group flex cursor-pointer items-center gap-2 rounded-full bg-[#087b4c] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_25px_rgba(8,123,76,0.25)] transition hover:-translate-y-0.5 hover:bg-[#07673f]"
                >
                  <Compass size={18} />

                  Khám phá bản đồ

                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-1"
                  />
                </button>

                <a
                  href="/hanh-trinh-ve-nguon"
                  className="flex items-center gap-2 rounded-full border border-[#cde2d4] bg-white px-5 py-3 text-sm font-bold text-[#17603f] shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fc7ad]"
                >
                  <Play
                    size={16}
                    fill="currentColor"
                  />

                  Hành trình về nguồn
                </a>

              </div>

              {/* STATS */}

              <div className="mt-8 flex items-center gap-5 border-t border-[#dce9df] pt-5">

                <button
                  onClick={() => scrollTo("ban-do")}
                  className="group cursor-pointer text-left transition hover:-translate-y-0.5"
                >
                  <HeroStat
                    value="124"
                    label="xã, phường, đặc khu"
                  />
                </button>

                <div className="h-8 w-px bg-[#d8e6dc]" />

                <button
                  onClick={() => scrollTo("mien-dat")}
                  className="group cursor-pointer text-left transition hover:-translate-y-0.5"
                >
                  <HeroStat
                    value="3"
                    label="vùng đất"
                  />
                </button>

                <div className="h-8 w-px bg-[#d8e6dc]" />

                <button
                  onClick={() => scrollTo("cau-chuyen")}
                  className="group cursor-pointer text-left transition hover:-translate-y-0.5"
                >
                  <HeroStat
                    value="∞"
                    label="câu chuyện"
                  />
                </button>

              </div>

              <div className="mt-2 text-[9px] text-[#8ca097]">
                Chạm vào từng con số để bắt đầu khám phá
              </div>

            </div>

            {/* =================================================
                MAP CARD
            ================================================== */}

            <div
              id="ban-do"
              className="relative scroll-mt-24"
            >

              <div className="relative h-[590px] overflow-hidden rounded-[28px] border-[5px] border-white bg-[#dfeee4] shadow-[0_25px_70px_rgba(24,75,48,0.18)] sm:h-[660px] lg:h-[720px]">

                <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-[#063d28]/10 via-transparent to-white/5" />

                {/* =================================================
                    BẢN ĐỒ GIỮ NGUYÊN
                ================================================== */}

                <LamDongMap />

              </div>

              <div className="mt-2 flex items-center justify-center gap-2 text-[9px] text-[#81968b] sm:text-[10px]">
                <MapPin size={12} />
                Chọn một xã, phường hoặc đặc khu để bắt đầu
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          TRẢI NGHIỆM BẢN ĐỒ
      ====================================================== */}

      <section
        id="cau-chuyen"
        className="relative scroll-mt-20 overflow-hidden bg-[#073f2b] py-14 text-white sm:py-20"
      >

        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#18a96d]/20 blur-3xl" />

        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#f4c430]/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">

          <div className="max-w-[760px]">

            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8ed9b2]">
              Khám phá trên bản đồ
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Chạm vào một vùng đất.
              <br />
              Mở ra một câu chuyện.
            </h2>

            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#acd0bc] sm:text-base">
              Bản đồ là nơi bắt đầu. Chọn một xã, phường
              hoặc đặc khu để tìm những địa chỉ đỏ, điểm
              đến, dấu ấn văn hóa và những câu chuyện
              gắn với vùng đất ấy.
            </p>

          </div>

          {/* 3 BƯỚC */}

          <div className="mt-10 grid gap-3 sm:grid-cols-3">

            <ExploreStep
              number="01"
              title="Chọn vùng đất"
              text="Chạm trực tiếp vào bản đồ để chọn nơi bạn muốn khám phá."
              icon={<Map size={21} />}
            />

            <ExploreStep
              number="02"
              title="Tìm dấu ấn"
              text="Các địa điểm và câu chuyện thuộc vùng đất sẽ dần mở ra."
              icon={<MapPin size={21} />}
            />

            <ExploreStep
              number="03"
              title="Đi sâu hơn"
              text="Kéo xuống để xem hình ảnh, lịch sử, văn hóa và những trải nghiệm khác."
              icon={<Sparkles size={21} />}
            />

          </div>

        </div>
      </section>

      {/* =====================================================
          NỘI DUNG VÙNG ĐẤT
      ====================================================== */}

      <section
        id="mien-dat"
        className="relative scroll-mt-20 bg-[#f5f8f5] py-14 sm:py-20"
      >

        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">

          <div className="mb-7 flex items-end justify-between">

            <div>

              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a9587]">
                Những miền đất
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#104d34] sm:text-3xl">
                Từ Ngàn Hoa đến Biển Xanh,
                <br className="hidden sm:block" />
                từ Đại Ngàn đến đảo xa.
              </h2>

              <p className="mt-3 max-w-[720px] text-sm leading-6 text-[#72897e]">
                Mỗi vùng đất là một lớp câu chuyện.
                Chọn một miền để tiếp tục hành trình,
                rồi quay lại bản đồ để khám phá sâu hơn.
              </p>

            </div>

            <div className="hidden items-center gap-2 sm:flex">

              <button
                onClick={() => scrollPlaces("left")}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#d4e3d9] bg-white text-[#17603f] shadow-sm transition hover:bg-[#087b4c] hover:text-white"
                aria-label="Xem miền đất trước"
              >
                <ArrowLeft size={17} />
              </button>

              <button
                onClick={() => scrollPlaces("right")}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#d4e3d9] bg-white text-[#17603f] shadow-sm transition hover:bg-[#087b4c] hover:text-white"
                aria-label="Xem miền đất tiếp theo"
              >
                <ArrowRight size={17} />
              </button>

            </div>

          </div>

          <div
            ref={placesRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] sm:gap-4"
          >

            {quickPlaces.map((place) => (

              <button
                key={place.name}
                onClick={() => scrollTo("ban-do")}
                className="group relative min-w-[210px] snap-start cursor-pointer overflow-hidden rounded-2xl border border-[#dce9df] bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-w-[260px] lg:min-w-[285px]"
              >

                <div className="mb-8 text-4xl transition duration-300 group-hover:scale-110">
                  {place.emoji}
                </div>

                <div className="text-base font-bold text-[#145c3a]">
                  {place.name}
                </div>

                <div className="mt-1 text-[10px] text-[#82958b]">
                  {place.label}
                </div>

                <div className="mt-5 flex items-center gap-1 text-[10px] font-bold text-[#087043]">
                  Khám phá trên bản đồ

                  <ArrowRight
                    size={13}
                    className="transition group-hover:translate-x-1"
                  />
                </div>

                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#eef7f1] transition group-hover:scale-125" />

              </button>

            ))}

          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-[9px] font-medium text-[#91a198] sm:hidden">
            <ArrowLeft size={11} />
            Vuốt để khám phá
            <ArrowRight size={11} />
          </div>

        </div>
      </section>

      {/* =====================================================
          VÙNG ĐẤT ĐANG KHÁM PHÁ
          PLACEHOLDER CHO DỮ LIỆU ĐỘNG SAU NÀY
      ====================================================== */}

      <section className="px-4 pb-14 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="overflow-hidden rounded-[28px] border border-[#dce9df] bg-white shadow-[0_15px_50px_rgba(25,65,43,0.08)]">

            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">

              <div className="bg-[#edf6ef] p-7 sm:p-10">

                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6f9280]">
                  Sau khi chọn trên bản đồ
                </div>

                <h2 className="mt-2 text-2xl font-black text-[#104d34] sm:text-3xl">
                  Vùng đất bạn đang khám phá
                </h2>

                <p className="mt-4 max-w-[500px] text-sm leading-6 text-[#72897e]">
                  Khi một địa danh được chọn trên bản đồ,
                  khu vực này sẽ trở thành không gian tiếp
                  tục trải nghiệm: địa chỉ đỏ, địa danh,
                  lịch sử, văn hóa, thiên nhiên và con người.
                </p>

                <button
                  onClick={() => scrollTo("ban-do")}
                  className="mt-6 flex cursor-pointer items-center gap-2 rounded-full bg-[#087b4c] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#07673f]"
                >
                  <Map size={15} />
                  Chọn trên bản đồ
                </button>

              </div>

              <div className="grid grid-cols-2 gap-px bg-[#dce9df] sm:grid-cols-4">

                <InfoDoor
                  icon={<History size={20} />}
                  title="Địa chỉ đỏ"
                  text="Lịch sử · cách mạng"
                  color="text-[#e84c3d]"
                />

                <InfoDoor
                  icon={<Mountain size={20} />}
                  title="Danh thắng"
                  text="Thiên nhiên · cảnh quan"
                  color="text-[#087c55]"
                />

                <InfoDoor
                  icon={<Sparkles size={20} />}
                  title="Văn hóa"
                  text="Con người · di sản"
                  color="text-[#d28b19]"
                />

                <InfoDoor
                  icon={<Waves size={20} />}
                  title="Trải nghiệm"
                  text="Điểm đến · hành trình"
                  color="text-[#0784a3]"
                />

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          HÀNH TRÌNH VỀ NGUỒN
      ====================================================== */}

      <section
        id="hanh-trinh"
        className="scroll-mt-20 px-4 pb-12 sm:px-6 lg:px-8"
      >

        <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b6543] to-[#063c29] px-6 py-9 text-white shadow-[0_20px_60px_rgba(6,60,41,0.2)] sm:px-10 sm:py-12">

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

            <div>

              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9fe0ba]">
                <History size={14} />
                Giáo dục truyền thống
              </div>

              <h2 className="max-w-[700px] text-2xl font-black tracking-tight sm:text-3xl">
                Mỗi địa danh là một câu chuyện.
                <br />
                Mỗi câu chuyện là một bài học.
              </h2>

              <p className="mt-3 max-w-[650px] text-sm leading-6 text-[#b4d4c3]">
                Từ bản đồ, tiếp tục đi sâu vào lịch sử
                cách mạng, nhân vật, sự kiện và những
                địa chỉ đỏ gắn với từng vùng đất.
              </p>

            </div>

            <a
              href="/hanh-trinh-ve-nguon"
              className="group flex w-fit items-center gap-3 rounded-full bg-[#f4c430] px-5 py-3 text-sm font-extrabold text-[#5e4900] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffd65b]"
            >
              Bắt đầu hành trình

              <ArrowRight
                size={17}
                className="transition group-hover:translate-x-1"
              />
            </a>

          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-[#dce9df] bg-white px-4 py-7">

        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 text-xs text-[#789087] sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-2">

            <img
              src="/logo-doan.png"
              alt="Đoàn TNCS Hồ Chí Minh"
              className="h-7 w-7 object-contain"
            />

            <div>
              <span className="font-bold text-[#17603f]">
                LÂM ĐỒNG
              </span>{" "}
              · Bản giao hưởng xanh
            </div>

          </div>

          <div className="flex items-center gap-2">
            <MapPin size={13} />
            Ngàn Hoa · Biển Xanh · Đại Ngàn
          </div>

        </div>
      </footer>

      {/* =====================================================
          SEARCH MODAL
      ====================================================== */}

      {searchOpen && (

        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#052e20]/45 px-4 pt-24 backdrop-blur-sm">

          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">

            <div className="flex items-center gap-3 border-b border-[#e1ebe4] px-5">

              <Search
                size={20}
                className="text-[#087043]"
              />

              <input
                autoFocus
                placeholder="Bạn muốn khám phá điều gì?"
                className="h-16 flex-1 bg-transparent text-base outline-none placeholder:text-[#9aaaa2]"
              />

              <button
                onClick={() => setSearchOpen(false)}
                className="cursor-pointer rounded-xl p-2 text-[#70877a] hover:bg-[#f0f6f2]"
                aria-label="Đóng tìm kiếm"
              >
                <X size={19} />
              </button>

            </div>

            <div className="p-5">

              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#91a198]">
                Gợi ý
              </div>

              <div className="grid grid-cols-2 gap-2">

                {searchSuggestions.map((item) => {

                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#f3f8f4] px-3 py-3 text-left text-xs font-semibold text-[#426657] transition hover:bg-[#e5f2e9]"
                    >
                      <Icon
                        size={16}
                        className={item.color}
                      />

                      {item.label}
                    </button>
                  );
                })}

              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function HeaderItem({
  icon,
  label,
  active = false,
  iconClass = "",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  iconClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-[#e8f5ed] text-[#087043]"
          : "text-[#607a6d] hover:bg-[#f1f7f3] hover:text-[#087043]"
      }`}
    >
      <span className={iconClass}>
        {icon}
      </span>

      {label}
    </button>
  );
}

function MobileItem({
  icon,
  label,
  iconClass = "",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  iconClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#416356] hover:bg-[#eff7f2]"
    >
      <span className={iconClass}>
        {icon}
      </span>

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
      <div className="text-lg font-black text-[#087043] transition group-hover:text-[#e0a900]">
        {value}
      </div>

      <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#84978d]">
        {label}
      </div>
    </div>
  );
}

function ExploreStep({
  number,
  title,
  text,
  icon,
}: {
  number: string;
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.07] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.11]">

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c6243] text-[#9fe0ba]">
          {icon}
        </div>

        <div className="text-[10px] font-black tracking-[0.15em] text-[#5d987b]">
          {number}
        </div>

      </div>

      <div className="mt-5 text-sm font-bold">
        {title}
      </div>

      <p className="mt-2 text-[11px] leading-5 text-[#9fc4b0]">
        {text}
      </p>

    </div>
  );
}

function InfoDoor({
  icon,
  title,
  text,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  color: string;
}) {
  return (
    <button className="group bg-white p-5 text-left transition hover:bg-[#f7fbf8]">

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f7f3] ${color} transition group-hover:scale-110`}
      >
        {icon}
      </div>

      <div className="mt-4 text-sm font-bold text-[#285b42]">
        {title}
      </div>

      <div className="mt-1 text-[10px] text-[#82958b]">
        {text}
      </div>

      <div className="mt-4 flex items-center gap-1 text-[9px] font-bold text-[#087043]">
        Khám phá
        <ArrowRight size={11} />
      </div>

    </button>
  );
}