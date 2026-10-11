"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  ExternalLink,
  Headphones,
  Landmark,
  MapPin,
  Play,
  Rotate3D,
  Search,
  Sparkles,
  Trees,
  Users,
  Utensils,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Ward = {
  id: number | string;
  code?: string | null;
  name: string;
  type?: string | null;
  introduction?: string | null;
};

type Place = {
  id: number | string;
  name: string;
  slug?: string | null;
  type?: string | null;
  place_type_id?: number | string | null;
  ward_id?: number | string | null;
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
  sort_order?: number | null;
};

type WardStory = {
  id: number | string;
  ward_id: string;
  category: "history" | "culture" | "people" | "cuisine" | "other";
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  cover_image?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
  vr360_url?: string | null;
  source?: string | null;
  sort_order?: number | null;
};

type MapPlace = {
  id?: number | string;
  name?: string;
  type?: string;
  slug?: string;
  dbId?: number | string;
  ward_id?: number | string;
  address?: string;
  image?: string;
  summary?: string;
  description?: string;
  short_description?: string;
  cover_image?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  vr360_url?: string;
  audio_url?: string;
  video_url?: string;
  historical_period?: string;
  recognition?: string;
  source?: string;
  googleMapsUrl?: string;
  [key: string]: unknown;
};

type PlaceType = {
  id: number | string;
  name: string;
};

type PanelFilter = "all" | "history" | "culture" | "nature";

type WardEventDetail = {
  id?: number | string;
  dbId?: number | string;
  ward_id?: number | string;
  code?: string;
  name?: string;
  type?: string;
  introduction?: string;
  ward?: Ward;
};

const PLACE_FIELDS =
  "id,name,slug,place_type_id,ward_id,address,latitude,longitude,short_description,description,cover_image,vr360_url,audio_url,video_url,historical_period,recognition,source,sort_order";

const STORY_FIELDS =
  "id,ward_id,category,title,slug,summary,content,cover_image,audio_url,video_url,vr360_url,source,sort_order,is_published";

const FILTERS: {
  id: PanelFilter;
  label: string;
  subtitle: string;
  icon: typeof Landmark;
}[] = [
  
  
];

const STORY_CATEGORIES = [
  {
    id: "history",
    label: "Lịch sử",
    subtitle: "Dấu ấn lịch sử và ký ức địa phương",
    icon: Landmark,
    accent: "gold",
  },
  {
    id: "culture",
    label: "Văn hóa",
    subtitle: "Di sản, bản sắc và truyền thống",
    icon: BookOpen,
    accent: "green",
  },
  {
    id: "people",
    label: "Con người và đời sống",
    subtitle: "Những con người, nghề nghiệp và nếp sống",
    icon: Users,
    accent: "blue",
  },
  {
    id: "cuisine",
    label: "Ẩm thực",
    subtitle: "Hương vị và đặc sản địa phương",
    icon: Utensils,
    accent: "gold",
  },
  {
    id: "other",
    label: "Câu chuyện khác",
    subtitle: "Những giá trị và câu chuyện đặc sắc",
    icon: Sparkles,
    accent: "green",
  },
] as const;

function readDetail<T>(event: Event): T | null {
  return (event as CustomEvent<T>).detail ?? null;
}

function sameId(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
) {
  return a != null && b != null && String(a) === String(b);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function getTypeName(place: Place, types: PlaceType[]) {
  return (
    types.find((type) => sameId(type.id, place.place_type_id))?.name ??
    place.type ??
    "Địa danh"
  );
}

function matchesCategory(
  place: Place,
  typeName: string,
  filter: PanelFilter,
) {
  if (filter === "all") return true;

  const text = [
    place.name,
    place.short_description,
    place.description,
    place.historical_period,
    place.recognition,
    typeName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (filter === "history") {
    return /lịch sử|cách mạng|di tích|kháng chiến|địa chỉ đỏ|chiến khu|tưởng niệm|bảo tàng|dinh|nhà tù|căn cứ/.test(
      text,
    );
  }

  if (filter === "culture") {
    return /văn hóa|văn hoá|lễ hội|truyền thống|di sản|dân tộc|làng nghề|kiến trúc|tín ngưỡng|chùa|đình|nhà thờ/.test(
      text,
    );
  }

  return /thiên nhiên|rừng|thác|hồ|núi|suối|đồi|biển|đảo|vườn quốc gia|khu bảo tồn|cảnh quan/.test(
    text,
  );
}

function toPreviewPlace(item: MapPlace): Place {
  return {
    id: item.id ?? item.dbId ?? `map-${item.name ?? "place"}`,
    name: item.name ?? "Địa danh được chọn",
    slug: item.slug,
    type: item.type,
    ward_id: item.ward_id,
    address: item.address,
    latitude: item.latitude ?? item.lat,
    longitude: item.longitude ?? item.lng,
    short_description: item.short_description ?? item.summary,
    description: item.description ?? item.summary,
    cover_image: item.cover_image ?? item.image,
    vr360_url: item.vr360_url,
    audio_url: item.audio_url,
    video_url: item.video_url,
    historical_period: item.historical_period,
    recognition: item.recognition,
    source: item.source,
  };
}

function getDirectionsUrl(place: Place) {
  if (
    typeof place.latitude === "number" &&
    typeof place.longitude === "number"
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }

  if (place.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}`;
  }

  return null;
}

function InfoSection({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof BookOpen;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="group cursor-pointer rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-md sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition-colors duration-200 group-hover:bg-emerald-100 group-hover:text-emerald-700">
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
            {eyebrow}
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-stone-800 transition-colors duration-200 group-hover:text-emerald-800 sm:text-base">
            {title}
          </h3>
        </div>
      </div>

      {children}
    </section>
  );
}



function Metadata({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-stone-100 py-3 last:border-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
        {label}
      </p>
      <p className="whitespace-pre-line text-sm leading-6 text-stone-700">
        {value || "Chưa cập nhật thông tin"}
      </p>
    </div>
  );
}

function MediaLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href?: string | null;
  icon: typeof Play;
  title: string;
  description: string;
}) {
  if (!href) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-600">{title}</p>
          <p className="mt-1 text-xs text-stone-400">
            Chưa cập nhật thông tin
          </p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 transition group-hover:bg-emerald-800 group-hover:text-white">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-800">{title}</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          {description}
        </p>
      </div>
      <ExternalLink size={14} className="shrink-0 text-stone-400" />
    </a>
  );
}

function PlaceCard({
  place,
  wardName,
  typeName,
  selected,
  onSelect,
}: {
  place: Place;
  wardName: string;
  typeName: string;
  selected: boolean;
  onSelect: (place: Place) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      aria-pressed={selected}
      className={`group relative flex w-[178px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-white text-left transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-[194px] ${
        selected
          ? "border-emerald-500 ring-2 ring-emerald-700/15"
          : "border-stone-200 hover:border-emerald-300"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-emerald-100 via-[#e7eddf] to-amber-50">
        {place.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.cover_image}
            alt={place.name}
            loading="lazy"
            className="place-image h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-emerald-800 shadow-sm">
              <Landmark size={27} strokeWidth={1.4} />
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

        <span className="absolute left-2.5 top-2.5 max-w-[calc(100%-20px)] truncate rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
          {typeName}
        </span>

        {selected && (
          <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white shadow">
            <CheckCircle2 size={16} />
          </span>
        )}

        <span className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-20px)] items-center gap-1.5 truncate text-[11px] font-medium text-white drop-shadow">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{wardName}</span>
        </span>
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[#244a36] transition group-hover:text-emerald-700">
          {place.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-stone-500">
          {place.short_description ||
            place.description ||
            "Chưa cập nhật thông tin giới thiệu."}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs font-bold text-emerald-800">
          <span>Xem hồ sơ</span>
          <ArrowRight size={14} />
        </div>
      </div>
    </button>
  );
}

function HorizontalPlaceSection({
  title,
  subtitle,
  icon: Icon,
  places,
  placeTypes,
  wardName,
  activePlaceId,
  onSelect,
  accent = "green",
}: {
  title: string;
  subtitle: string;
  icon: typeof Landmark;
  places: Place[];
  placeTypes: PlaceType[];
  wardName: string;
  activePlaceId?: number | string;
  onSelect: (place: Place) => void;
  accent?: "green" | "gold" | "blue";
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const colors = {
    green: "bg-emerald-50 text-emerald-800",
    gold: "bg-amber-50 text-amber-800",
    blue: "bg-sky-50 text-sky-800",
  }[accent];

  const move = (direction: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left:
        direction *
        Math.min(430, (scrollerRef.current?.clientWidth ?? 400) * 0.85),
      behavior: "smooth",
    });
  };

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white/80 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors}`}>
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-800 sm:text-base">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
          </div>
          <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600">
            {places.length}
          </span>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={`Cuộn ${title} sang trái`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <ArrowLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={`Cuộn ${title} sang phải`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {places.length > 0 ? (
        <div
          ref={scrollerRef}
          className="horizontal-place-scroller flex gap-3 overflow-x-auto pb-2 pt-1"
        >
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              wardName={wardName}
              typeName={getTypeName(place, placeTypes)}
              selected={sameId(activePlaceId, place.id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-5">
          <p className="text-sm font-semibold text-stone-600">
            Chưa có địa danh trong mục này
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Khi có dữ liệu phù hợp được cập nhật, địa danh sẽ hiển thị tại đây.
          </p>
        </div>
      )}
    </section>
  );
}

function StoryCard({ story }: { story: WardStory }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg sm:w-[290px]">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-100 via-[#e7eddf] to-amber-50">
        {story.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.cover_image}
            alt={story.title}
            loading="lazy"
            className="place-image h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-emerald-800">
            <BookOpen size={34} strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
          Câu chuyện địa phương
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h4 className="line-clamp-2 text-sm font-bold leading-5 text-[#244a36]">
          {story.title}
        </h4>

        {story.summary && (
          <p className="mt-2 whitespace-pre-line text-xs leading-5 text-stone-600">
            {story.summary}
          </p>
        )}

        {expanded && story.content && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <p className="whitespace-pre-line text-xs leading-6 text-stone-600">
              {story.content}
            </p>
          </div>
        )}

        {story.content && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-3 inline-flex items-center gap-1 self-start text-xs font-bold text-emerald-800 hover:text-emerald-600"
          >
            {expanded ? "Thu gọn nội dung" : "Đọc câu chuyện"}
            <ArrowDown
              size={13}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}

        <div className="mt-auto space-y-2 pt-3">
          {(story.vr360_url || story.audio_url || story.video_url) && (
            <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
              {story.vr360_url && (
                <a
                  href={story.vr360_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Rotate3D size={14} /> VR360
                  <ExternalLink size={11} />
                </a>
              )}
              {story.audio_url && (
                <a
                  href={story.audio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Headphones size={14} /> Âm thanh
                  <ExternalLink size={11} />
                </a>
              )}
              {story.video_url && (
                <a
                  href={story.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Play size={14} /> Video
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {story.source && (
            <p className="border-t border-stone-100 pt-2 text-[10px] leading-4 text-stone-400">
              <span className="font-semibold text-stone-500">Nguồn: </span>
              {story.source}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function HorizontalStorySection({
  title,
  subtitle,
  icon: Icon,
  stories,
  accent = "green",
}: {
  title: string;
  subtitle: string;
  icon: typeof Landmark;
  stories: WardStory[];
  accent?: "green" | "gold" | "blue";
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const colors = {
    green: "bg-emerald-50 text-emerald-800",
    gold: "bg-amber-50 text-amber-800",
    blue: "bg-sky-50 text-sky-800",
  }[accent];

  const move = (direction: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left:
        direction *
        Math.min(430, (scrollerRef.current?.clientWidth ?? 400) * 0.85),
      behavior: "smooth",
    });
  };

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white/80 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors}`}>
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-stone-800 sm:text-base">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
          </div>
          <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600">
            {stories.length}
          </span>
        </div>

        {stories.length > 1 && (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={`Cuộn ${title} sang trái`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={`Cuộn ${title} sang phải`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="horizontal-place-scroller flex gap-3 overflow-x-auto pb-2 pt-1"
      >
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}

export default function ExplorationPanel() {
  const [ward, setWard] = useState<Ward | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [stories, setStories] = useState<WardStory[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [previewPlace, setPreviewPlace] = useState<Place | null>(null);

  const [filter, setFilter] = useState<PanelFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storyLoading, setStoryLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [storyError, setStoryError] = useState("");
  const [detailExpanded, setDetailExpanded] = useState(true);

  const requestNumber = useRef(0);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTypes() {
      const { data, error } = await supabase
        .from("place_types")
        .select("id,name")
        .order("sort_order", { ascending: true });

      if (!cancelled && !error) {
        setPlaceTypes((data ?? []) as PlaceType[]);
      }
    }

    void loadTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleWardSelected = useCallback(
    async (detail: WardEventDetail | null) => {
      if (!detail) return;

      const incomingWard = detail.ward;
      const rawWardId =
        detail.dbId ??
        detail.ward_id ??
        incomingWard?.id ??
        detail.id;

      const wardName = incomingWard?.name ?? detail.name ?? "";
      const wardCode = incomingWard?.code ?? detail.code ?? undefined;

      if (!wardName) return;

      const currentRequest = ++requestNumber.current;

      setWard({
        id: rawWardId ?? `map-ward-${wardName}`,
        name: wardName,
        code: wardCode,
        type: incomingWard?.type ?? detail.type,
        introduction:
          incomingWard?.introduction ?? detail.introduction,
      });

      setPlaces([]);
      setStories([]);
      setSelectedPlace(null);
      setPreviewPlace(null);
      setFilter("all");
      setKeyword("");
      setSearchOpen(false);
      setLoadError("");
      setStoryError("");
      setLoading(true);
      setStoryLoading(true);

      try {
        let wardId: string | null = isUuid(rawWardId)
          ? rawWardId
          : null;

        // Bản đồ có thể gửi mã địa bàn thay vì UUID trong bảng wards.
        // Nếu vậy, tra lại UUID bằng code hoặc tên chính xác.
        if (!wardId && wardCode) {
          const { data, error } = await supabase
            .from("wards")
            .select("id,name,code,type,introduction")
            .eq("code", String(wardCode))
            .maybeSingle();

          if (error) throw error;
          if (data?.id) {
            wardId = String(data.id);
            setWard({
              id: wardId,
              name: data.name ?? wardName,
              code: data.code ?? wardCode,
              type: data.type ?? incomingWard?.type ?? detail.type,
              introduction:
                data.introduction ??
                incomingWard?.introduction ??
                detail.introduction,
            });
          }
        }

        if (!wardId && wardName) {
          const { data, error } = await supabase
            .from("wards")
            .select("id,name,code,type,introduction")
            .eq("name", wardName)
            .maybeSingle();

          if (error) throw error;
          if (data?.id) {
            wardId = String(data.id);
            setWard({
              id: wardId,
              name: data.name ?? wardName,
              code: data.code ?? wardCode,
              type: data.type ?? incomingWard?.type ?? detail.type,
              introduction:
                data.introduction ??
                incomingWard?.introduction ??
                detail.introduction,
            });
          }
        }

        if (!wardId) {
          throw new Error(
            "Không xác định được UUID của địa bàn trong bảng wards.",
          );
        }

        const [placesResult, storiesResult] = await Promise.all([
          supabase
            .from("places")
            .select(PLACE_FIELDS)
            .eq("ward_id", wardId)
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("ward_stories")
            .select(STORY_FIELDS)
            .eq("ward_id", wardId)
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
        ]);

        if (currentRequest !== requestNumber.current) return;

        if (placesResult.error) throw placesResult.error;

        setPlaces((placesResult.data ?? []) as Place[]);

        if (storiesResult.error) {
          setStories([]);
          setStoryError(
            "Chưa thể tải câu chuyện của địa bàn. Vui lòng kiểm tra bảng ward_stories và quyền đọc dữ liệu.",
          );
        } else {
          setStories((storiesResult.data ?? []) as WardStory[]);
        }
      } catch (error) {
        if (currentRequest === requestNumber.current) {
          setLoadError(
            error instanceof Error && error.message.includes("UUID")
              ? "Chưa xác định được mã địa bàn trong cơ sở dữ liệu. Hãy kiểm tra wards.id, wards.code và dữ liệu gửi từ bản đồ."
              : "Chưa thể tải dữ liệu của địa bàn này. Vui lòng kiểm tra kết nối Supabase và thử tải lại.",
          );
        }
      } finally {
        if (currentRequest === requestNumber.current) {
          setLoading(false);
          setStoryLoading(false);
        }
      }
    },
    [],
  );

  const handlePlaceSelected = useCallback(
    (detail: MapPlace | null) => {
      if (!detail) return;

      const match = places.find(
        (place) =>
          sameId(place.id, detail.id ?? detail.dbId) ||
          (!!detail.slug && place.slug === detail.slug) ||
          (!!detail.name &&
            place.name.trim().toLowerCase() ===
              detail.name.trim().toLowerCase()),
      );

      if (match) {
        setSelectedPlace(match);
        setPreviewPlace(null);
      } else {
        setSelectedPlace(null);
        setPreviewPlace(toPreviewPlace(detail));
      }

      setDetailExpanded(true);
      setSearchOpen(false);

      window.setTimeout(() => {
        document.getElementById("ho-so-dia-danh")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    [places],
  );

  useEffect(() => {
    const onWardSelected = (event: Event) => {
      void handleWardSelected(readDetail<WardEventDetail>(event));
    };

    const onWardCleared = () => {
      requestNumber.current += 1;
      setWard(null);
      setPlaces([]);
      setStories([]);
      setSelectedPlace(null);
      setPreviewPlace(null);
      setFilter("all");
      setKeyword("");
      setSearchOpen(false);
      setLoadError("");
      setStoryError("");
      setLoading(false);
      setStoryLoading(false);
    };

    const onPlaceSelected = (event: Event) => {
      handlePlaceSelected(readDetail<MapPlace>(event));
    };

    window.addEventListener("lamdong:ward-selected", onWardSelected);
    window.addEventListener("lamdong:ward-cleared", onWardCleared);
    window.addEventListener("lamdong:place-selected", onPlaceSelected);

    return () => {
      window.removeEventListener("lamdong:ward-selected", onWardSelected);
      window.removeEventListener("lamdong:ward-cleared", onWardCleared);
      window.removeEventListener("lamdong:place-selected", onPlaceSelected);
    };
  }, [handleWardSelected, handlePlaceSelected]);

  useEffect(() => {
    if (!previewPlace || places.length === 0) return;

    const match = places.find(
      (place) =>
        sameId(place.id, previewPlace.id) ||
        (!!previewPlace.slug && place.slug === previewPlace.slug) ||
        place.name.trim().toLowerCase() ===
          previewPlace.name.trim().toLowerCase(),
    );

    if (match) {
      setSelectedPlace(match);
      setPreviewPlace(null);
    }
  }, [places, previewPlace]);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("touchstart", onOutsideClick);

    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("touchstart", onOutsideClick);
    };
  }, []);

  const activePlace = selectedPlace ?? previewPlace;
  const activeTypeName = activePlace
    ? getTypeName(activePlace, placeTypes)
    : "";
  const directionsUrl = activePlace
    ? getDirectionsUrl(activePlace)
    : null;

  const filteredPlaces = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase("vi");

    return places.filter((place) => {
      const typeName = getTypeName(place, placeTypes);
      const categoryMatches = matchesCategory(place, typeName, filter);

      const queryMatches =
        !query ||
        [
          place.name,
          place.address,
          place.short_description,
          place.description,
          place.historical_period,
          place.recognition,
          typeName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("vi").includes(query),
          );

      return categoryMatches && queryMatches;
    });
  }, [places, placeTypes, filter, keyword]);

  const searchSuggestions = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase("vi");

    if (!query) return places;

    return places.filter((place) =>
      [
        place.name,
        place.address,
        place.short_description,
        place.description,
        place.historical_period,
        place.recognition,
        getTypeName(place, placeTypes),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("vi").includes(query),
        ),
    );
  }, [places, placeTypes, keyword]);

  const selectPlace = (place: Place) => {
    setSelectedPlace(place);
    setPreviewPlace(null);
    setDetailExpanded(true);
    setSearchOpen(false);

    window.dispatchEvent(
      new CustomEvent("lamdong:place-detail-opened", {
        detail: place,
      }),
    );

    window.setTimeout(() => {
      document.getElementById("ho-so-dia-danh")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const scrollToPlaces = () => {
    document.getElementById("danh-sach-dia-danh")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

 

  return (
    <div className="exploration-panel space-y-5 pb-8">
      <style jsx>{`
        .exploration-panel {
          color: #292f29;
        }

        .explore-enter {
          animation: exploreFadeUp 0.42s ease-out both;
        }

        .place-image {
          transition: transform 0.35s ease;
        }

        .horizontal-place-scroller {
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #b7cbb9 transparent;
          cursor: grab;
          touch-action: pan-x pan-y;
        }

        .horizontal-place-scroller:active {
          cursor: grabbing;
        }

        .horizontal-place-scroller > * {
          scroll-snap-align: start;
          -webkit-tap-highlight-color: transparent;
        }

        .exploration-panel button,
        .exploration-panel a {
          -webkit-tap-highlight-color: transparent;
        }

        @media (hover: hover) and (pointer: fine) {
          .horizontal-place-scroller > button:hover .place-image,
          .horizontal-place-scroller article:hover .place-image {
            transform: scale(1.04);
          }
        }

        .horizontal-place-scroller::-webkit-scrollbar {
          height: 6px;
        }

        .horizontal-place-scroller::-webkit-scrollbar-thumb {
          background: #b7cbb9;
          border-radius: 999px;
        }

        .horizontal-place-scroller::-webkit-scrollbar-track {
          background: transparent;
        }

        #chi-tiet-dia-danh,
        #danh-sach-dia-danh,
        #ho-so-dia-danh {
          scroll-margin-top: 24px;
        }

        @keyframes exploreFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .explore-enter {
            animation: none;
          }

          .place-image {
            transition: none;
          }

          .horizontal-place-scroller {
            scroll-behavior: auto;
          }
        }
      `}</style>

      {/* GIỚI THIỆU ĐỊA BÀN */}
      <section
        id="chi-tiet-dia-danh"
        className="explore-enter -mt-6 overflow-hidden rounded-[26px] border border-emerald-900/10 bg-[#f7f5e9] shadow-[0_12px_36px_rgba(37,65,43,0.08)]"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#173f30] via-[#205941] to-[#347452] px-5 py-6 text-white sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-8 -top-14 h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-1 -top-7 h-32 w-32 rounded-full border border-white/10" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-emerald-50">
                <Sparkles size={13} className="text-amber-200" />
                Lâm Đồng · Bản giao hưởng xanh
              </div>

              <p className="mb-1 text-xs text-emerald-100/80">
                {ward?.type || "Bản đồ khám phá"}
              </p>

              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                {ward?.name ?? "Khám phá vùng đất Lâm Đồng"}
              </h2>

              <p className="mt-1 whitespace-nowrap text-sm leading-6 text-emerald-50/85 sm:text-[15px]">
                {ward?.introduction ||
                  (ward
                    ? `Khám phá các địa danh, dấu ấn lịch sử, giá trị văn hóa và cảnh quan đặc sắc tại ${ward.name}.`
                    : "Chọn một xã, phường hoặc đặc khu trên bản đồ để xem các địa danh và câu chuyện gắn với vùng đất Ngàn Hoa – Biển Xanh – Đại Ngàn.")}
              </p>
            </div>

            {ward && (
              <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-3 sm:self-auto">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/15 text-amber-100">
                  <MapPin size={19} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-100/70">
                    Địa danh 
                  </p>
                  <p className="mt-0.5 text-lg font-bold">
                    {loading ? "…" : places.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LỐI TẮT DANH MỤC */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-1 pt-2 sm:grid-cols-4 sm:gap-3 sm:px-5 sm:pb-1 sm:pt-3">
          {FILTERS.map((item) => {
            const Icon = item.icon;
            const active = filter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  setKeyword("");
                  scrollToPlaces();
                }}
                className={`group flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg active:scale-[0.97] sm:gap-3 sm:rounded-2xl sm:px-3.5 sm:py-3 ${
                  active
                    ? "border-emerald-700 bg-emerald-50 shadow-sm"
                    : "border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/70"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 sm:h-10 sm:w-10 sm:rounded-xl ${
                    active
                      ? "bg-emerald-800 text-white"
                      : "bg-[#edf4eb] text-[#286344] group-hover:bg-emerald-700 group-hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-4 text-stone-800 sm:text-sm">
                    {item.label}
                  </span>
                  <span className="mt-0.5 hidden text-[10px] leading-4 text-stone-500 sm:block">
                    {item.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* TRA CỨU ĐỊA DANH */}
       
      </section>

      {/* ĐỊA DANH TIÊU BIỂU: KHÔNG LỌC THEO TỪ KHÓA/CHỦ ĐỀ */}
      <section
        id="danh-sach-dia-danh"
        className="explore-enter -mt-9 rounded-b-[26px] rounded-t-none border border-stone-200/80 bg-[#fcfbf7] p-4 shadow-sm sm:p-5"
      >
        <div className="-mt-1 mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-amber-700">
              <span className="h-px w-6 bg-amber-600/70" />
              Hành trình khám phá
            </div>
            <h2 className="text-lg font-bold tracking-normal text-[#244a36] sm:text-xl">
              Địa danh tiêu biểu
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              {ward
                ? `Khám phá các địa danh đặc sắc của ${ward.name}. Vuốt hoặc kéo ngang để xem thêm.`
                : "Chọn xã, phường hoặc đặc khu trên bản đồ để xem danh sách địa danh."}
            </p>
          </div>

          {ward && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <MapPin size={14} />
              {loading ? "Đang tải..." : `${places.length} địa danh`}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="w-[178px] shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-white sm:w-[194px]"
              >
                <div className="aspect-square animate-pulse bg-stone-200/70" />
                <div className="space-y-2 p-3">
                  <div className="h-4 animate-pulse rounded bg-stone-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {loadError}
            {ward && (
              <button
                type="button"
                onClick={() =>
                  void handleWardSelected({
                    dbId: isUuid(ward.id) ? ward.id : undefined,
                    code: ward.code ?? undefined,
                    name: ward.name,
                    type: ward.type ?? undefined,
                    introduction: ward.introduction ?? undefined,
                  })
                }
                className="ml-2 font-bold underline underline-offset-2"
              >
                Thử tải lại
              </button>
            )}
          </div>
        )}

        {!loading && !loadError && !ward && (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-[#f8f4e8] px-5 py-9 text-center">
            <Compass size={28} className="mx-auto text-emerald-800" />
            <h3 className="mt-3 text-sm font-bold text-[#244a36]">
              Bắt đầu từ bản đồ
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Chọn địa bàn để hiển thị các thẻ địa danh tại đây.
            </p>
          </div>
        )}

        {!loading && !loadError && ward && places.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-5 py-8 text-center">
            <MapPin size={25} className="mx-auto text-amber-700" />
            <h3 className="mt-3 text-sm font-bold text-stone-800">
              Chưa có địa danh
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Chưa có địa danh nào được xuất bản cho {ward.name}.
            </p>
          </div>
        )}

        {!loading && !loadError && places.length > 0 && (
          <>
            <div className="horizontal-place-scroller flex gap-3 overflow-x-auto pb-2 pt-1">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  wardName={ward?.name ?? "Lâm Đồng"}
                  typeName={getTypeName(place, placeTypes)}
                  selected={sameId(activePlace?.id, place.id)}
                  onSelect={selectPlace}
                />
              ))}
            </div>

            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-stone-400">
              <ArrowLeft size={13} />
              Vuốt hoặc kéo ngang để xem thêm địa danh
              <ArrowRight size={13} />
            </div>
          </>
        )}
      </section>

      {/* CÂU CHUYỆN RIÊNG TỪ BẢNG ward_stories */}
      {ward && (
        <section className="space-y-3">
          <div className="px-4 sm:px-6">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.10em] text-amber-700">
              <span className="h-px w-6 bg-amber-600/70" />
              Khám phá theo chủ đề
            </div>
            <h2 className="text-lg font-bold tracking-normal text-[#244a36] sm:text-xl">
              Những câu chuyện của {ward.name}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
            Khám phá những giá trị văn hóa, dấu ấn lịch sử và nét đẹp riêng của vùng đất và con người Phan Thiết.
            </p>
          </div>

          {storyLoading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
              Đang tải câu chuyện của {ward.name}...
            </div>
          ) : storyError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {storyError}
            </div>
          ) : stories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-[#f8f4e8] px-5 py-8 text-center">
              <BookOpen size={27} className="mx-auto text-emerald-800" />
              <h3 className="mt-3 text-sm font-bold text-[#244a36]">
                Chưa có câu chuyện được xuất bản
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">
                Câu chuyện sẽ hiển thị tại đây sau khi được bổ sung trong bảng
                dữ liệu ward_stories và chuyển sang trạng thái xuất bản.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {STORY_CATEGORIES.map((category) => {
                const categoryStories = stories.filter(
                  (story) => story.category === category.id,
                );

                if (categoryStories.length === 0) return null;

                return (
                  <HorizontalStorySection
                    key={category.id}
                    title={category.label}
                    subtitle={category.subtitle}
                    icon={category.icon}
                    stories={categoryStories}
                    accent={category.accent}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* HỒ SƠ CHI TIẾT ĐỊA DANH */}
      {activePlace && (
        <section
          id="ho-so-dia-danh"
          className="overflow-hidden rounded-[26px] border border-stone-200/80 bg-[#f8f6ee] shadow-[0_12px_36px_rgba(39,61,42,0.06)]"
        >
          <div className="flex flex-col gap-3 border-b border-stone-200/70 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.10em] text-amber-700">
                <span className="h-px w-6 bg-amber-600/70" />
                Hồ sơ địa danh
              </div>
              <h2 className="text-xl font-bold leading-tight text-[#244a36] sm:text-2xl">
                {activePlace.name}
              </h2>
              <p className="mt-1.5 text-xs text-stone-500">
                {ward?.name ?? "Lâm Đồng"}
                {activeTypeName ? ` · ${activeTypeName}` : ""}
              </p>
            </div>

            <button
  type="button"
  onClick={() => setDetailExpanded((current) => !current)}
  className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 sm:self-auto"
>
  {detailExpanded ? "Thu gọn hồ sơ" : "Mở hồ sơ"}
  <ArrowDown
    size={15}
    className={`transition-transform ${detailExpanded ? "rotate-180" : ""}`}
  />
</button>
          </div>

          {detailExpanded && (
            <div className="explore-enter p-4 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="min-w-0">
                  <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-100 via-[#e7eddf] to-amber-50">
                      {activePlace.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activePlace.cover_image}
                          alt={activePlace.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Landmark size={38} className="text-emerald-800" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-12">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-100">
                          Địa danh Lâm Đồng
                        </p>
                        <p className="mt-1 text-lg font-bold text-white">
                          {activePlace.name}
                        </p>
                      </div>
                    </div>

                    <div className="px-4">
                      <Metadata label="Địa bàn" value={ward?.name} />
                      <Metadata label="Địa chỉ" value={activePlace.address} />
                      <Metadata
                        label="Thời kỳ lịch sử"
                        value={activePlace.historical_period}
                      />
                      <Metadata
                        label="Công nhận, xếp hạng"
                        value={activePlace.recognition}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-stone-100 p-2">
  {directionsUrl ? (
    <a
      href={
        (activePlace as MapPlace).googleMapsUrl ||
        directionsUrl
      }
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-3 text-[11px] font-semibold leading-none text-white transition-colors hover:bg-emerald-700"
    >
      <Compass size={13} />
      <span>Chỉ đường đến đây</span>
      <ExternalLink size={11} />
    </a>
  ) : (
    <span className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-stone-100 px-3 text-[11px] font-medium leading-none text-stone-500">
      <MapPin size={13} />
      <span>Chưa cập nhật vị trí</span>
    </span>
  )}

  {activePlace.vr360_url ? (
    <a
      href={activePlace.vr360_url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-3 text-[11px] font-semibold leading-none text-white transition-colors hover:bg-emerald-700"
    >
      <Rotate3D size={13} />
      <span>Trải nghiệm VR360</span>
      <ExternalLink size={11} />
    </a>
  ) : (
    <button
      type="button"
      disabled
      title="Địa danh chưa có đường dẫn VR360"
      className="inline-flex h-9 shrink-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-3 text-[11px] font-semibold leading-none text-stone-500"
    >
      <Rotate3D size={13} />
      <span>Trải nghiệm VR360</span>
    </button>
    
  )}
   <button
  type="button"
  onClick={() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }}
  title="Quay lại bản đồ"
  aria-label="Quay lại bản đồ"
  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 transition-colors hover:bg-emerald-100"
>
  <MapPin size={15} />
</button>


</div>


                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <InfoSection
                    icon={BookOpen}
                    eyebrow="Giới thiệu"
                    title="Giới thiệu địa danh"
                  >
                    <p className="whitespace-pre-line text-sm leading-6 text-justify text-stone-600">
                      {activePlace.description ||
                        activePlace.short_description ||
                        "Chưa cập nhật thông tin giới thiệu địa danh."}
                    </p>
                  </InfoSection>

                  <InfoSection
                    icon={Landmark}
                    eyebrow="Dấu ấn thời gian"
                    title="Lịch sử và giá trị"
                  >
                    <div className="space-y-2">
                      <div>
                        <p className="mb-1 text-xs font-bold text-stone-700">
                          Thời kỳ lịch sử
                        </p>
                        <p className="rounded-xl bg-stone-50 px-3.5 py-2 text-sm leading-6 text-stone-600">
                          {activePlace.historical_period ||
                            "Chưa cập nhật thông tin"}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-bold text-justify text-stone-700">
                          Giá trị, danh hiệu và xếp hạng
                        </p>
                        <p className="rounded-xl bg-stone-50 px-3.5 py-2 text-sm leading-5 text-justify text-stone-600">
                          {activePlace.recognition ||
                            "Chưa cập nhật thông tin"}
                        </p>
                      </div>
                    </div>
                  </InfoSection>

                  <InfoSection
                    icon={Sparkles}
                    eyebrow="Bản sắc địa phương"
                    title="Văn hóa và câu chuyện"
                  >
                    <p className="whitespace-pre-line text-sm leading-6 text-justify text-stone-600">
                      {activePlace.short_description ||
                        "Chưa cập nhật thông tin về văn hóa và câu chuyện gắn với địa danh."}
                    </p>
                  </InfoSection>

                

                  {activePlace.source && (
                    <p className="text-xs leading-5 text-stone-500">
                      <span className="font-semibold text-stone-600">
                        Nguồn thông tin:{" "}
                      </span>
                      {activePlace.source}
                    </p>
                  )}

                  {previewPlace && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">
                      Đang hiển thị thông tin có sẵn từ bản đồ. Hồ sơ chi tiết
                      trong danh mục dữ liệu có thể chưa được cập nhật.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* THÔNG ĐIỆP CUỐI */}
      <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-r from-[#173f30] via-[#245b40] to-[#347452] px-5 py-5 text-white shadow-[0_10px_28px_rgba(29,76,49,0.12)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-8 -top-16 h-40 w-40 rounded-full border border-white/10" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-amber-100">
              <Trees size={23} strokeWidth={1.6} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-amber-100/90">
                Giáo dục truyền thống
              </p>
              <h2 className="mt-1 text-base font-bold sm:text-lg">
                Mỗi địa danh – Một câu chuyện quê hương
              </h2>
              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-emerald-50/80 sm:text-sm">
                Gìn giữ ký ức, lan tỏa giá trị lịch sử, văn hóa và bồi đắp niềm
                tự hào về vùng đất Lâm Đồng.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToPlaces}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 sm:self-auto"
          >
            Tiếp tục khám phá
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

