"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Home,
  List,
  MapPin,
  Search,
  X,
} from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl(
  "/maplibre/maplibre-gl-worker.mjs"
);

/* =========================================================
   TYPES
========================================================= */

type WardProperties = {
  name?: string;
  fullName?: string;
  province?: string;
  provinceCode?: string | number;
  wardCode?: string | number;
  type?: string;
};

type WardFeature = {
  type: "Feature";
  properties: WardProperties;
  geometry: GeoJSON.Geometry;
};

type WardCollection = {
  type: "FeatureCollection";
  features: WardFeature[];
};

type SelectedWard = {
  name: string;
  type: string;
};

type DemoPlace = {
  id: string;
  name: string;
  type: string;
  wardKeyword: string;
  lng: number;
  lat: number;
  address: string;
  googleMapsUrl: string;
  image: string;
  summary: string;
};

/* =========================================================
   MÀU XÃ / PHƯỜNG / ĐẶC KHU
========================================================= */

const PLACE_COLORS = [
  "#D8EEDB",
  "#E6F0D7",
  "#F5E8B8",
  "#F6DFC7",
  "#F1D9DC",
  "#E5DDF0",
  "#D9E8F3",
  "#D4EDE8",
  "#EAE4D2",
  "#E4E8D8",
  "#F0E3C9",
  "#DCEBE4",
  "#E9DDE6",
  "#DCE7F0",
  "#E8E2D0",
  "#DCEBDD",
];

const OUTSIDE_COLORS: Record<string, string> = {
  "Đắk Lắk": "#E7F0DC",
  "Khánh Hòa": "#F7EAD4",
  "Đồng Nai": "#E3EDF5",
  "Hồ Chí Minh": "#F1E2ED",
  "Gia Lai": "#EEE8D7",
  "Đồng Tháp": "#E5F0E8",
  "Tây Ninh": "#F0E6D6",
  "Quảng Ngãi": "#E7EDF4",
};

const INITIAL_CENTER: [number, number] = [
  108.02,
  11.7,
];

const INITIAL_ZOOM = 7.65;

/* =========================================================
   ĐỊA DANH DEMO
   Sau này thay bằng dữ liệu từ Admin / Supabase.
========================================================= */

const DEMO_PLACES: DemoPlace[] = [
  {
    id: "ga-da-lat",
    name: "Ga Đà Lạt",
    type: "Địa chỉ đỏ · Di tích",
    wardKeyword: "Xuân Hương",
    lng: 108.4583,
    lat: 11.9446,
    address:
      "Quang Trung, phường Xuân Hương – Đà Lạt, tỉnh Lâm Đồng",
    googleMapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=11.9446%2C108.4583",
    image: "/places/ga-da-lat.jpg",
    summary:
      "Công trình kiến trúc đường sắt nổi bật, gắn với lịch sử hình thành và phát triển của Đà Lạt.",
  },
  {
    id: "dinh-3-da-lat",
    name: "Dinh III Đà Lạt",
    type: "Di tích lịch sử",
    wardKeyword: "Xuân Hương",
    lng: 108.42967,
    lat: 11.93005,
    address:
      "01 Triệu Việt Vương, phường Xuân Hương – Đà Lạt, tỉnh Lâm Đồng",
    googleMapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=11.93005%2C108.42967",
    image: "/places/dinh-3.jpg",
    summary:
      "Công trình kiến trúc gắn với lịch sử Đà Lạt và một giai đoạn quan trọng của lịch sử Việt Nam.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim();
}

function getColorIndex(name: string) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash =
      (hash << 5) -
      hash +
      name.charCodeAt(i);

    hash |= 0;
  }

  return (
    Math.abs(hash) %
    PLACE_COLORS.length
  );
}

function buildWardColorExpression(
  features: WardFeature[]
): maplibregl.ExpressionSpecification {
  const expression: unknown[] = [
    "match",
    ["get", "name"],
  ];

  const used = new Set<string>();

  for (const feature of features) {
    const name = String(
      feature.properties?.name || ""
    ).trim();

    if (!name || used.has(name)) {
      continue;
    }

    used.add(name);

    expression.push(
      name,
      PLACE_COLORS[getColorIndex(name)]
    );
  }

  expression.push("#DDEBDD");

  return expression as maplibregl.ExpressionSpecification;
}

function getBoundsForFeature(
  feature: WardFeature
) {
  const bounds =
    new maplibregl.LngLatBounds();

  const geometry = feature.geometry;

  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      for (const point of ring) {
        bounds.extend(
          point as [number, number]
        );
      }
    }
  }

  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const point of ring) {
          bounds.extend(
            point as [number, number]
          );
        }
      }
    }
  }

  return bounds;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function LamDongMap() {
  const mapEl =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<maplibregl.Map | null>(null);

  const wardsRef =
    useRef<WardFeature[]>([]);

  const selectedRef =
    useRef<SelectedWard | null>(null);

  const markersRef =
    useRef<maplibregl.Marker[]>([]);

  const popupRef =
    useRef<maplibregl.Popup | null>(null);

  const [wards, setWards] =
    useState<WardFeature[]>([]);

  const [search, setSearch] =
    useState("");

  const [selected, setSelected] =
    useState<SelectedWard | null>(null);

  const [hoveredName, setHoveredName] =
    useState("");

  const [showList, setShowList] =
    useState(false);

  const [activePlace, setActivePlace] =
    useState<DemoPlace | null>(null);

  /* =======================================================
     XÓA MARKER + POPUP
  ======================================================= */

  function clearPlaceMarkers() {
    markersRef.current.forEach(
      (marker) => marker.remove()
    );

    markersRef.current = [];

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    setActivePlace(null);
  }

  /* =======================================================
     MỞ CHI TIẾT ĐỊA DANH
  ======================================================= */

  function openPlaceDetail(
    place: DemoPlace
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "lamdong:place-selected",
        {
          detail: place,
        }
      )
    );

    window.setTimeout(() => {
      document
        .getElementById(
          "chi-tiet-dia-danh"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  /* =======================================================
     TẠO MARKER ĐỊA DANH
  ======================================================= */

  function createPlaceMarker(
    place: DemoPlace
  ) {
    const markerElement =
      document.createElement("button");

    markerElement.type = "button";
    markerElement.title = place.name;

    markerElement.setAttribute(
      "aria-label",
      place.name
    );

    markerElement.style.width = "28px";
    markerElement.style.height = "36px";
    markerElement.style.padding = "0";
    markerElement.style.margin = "0";
    markerElement.style.border = "0";
    markerElement.style.background =
      "transparent";
    markerElement.style.cursor =
      "pointer";
    markerElement.style.position =
      "relative";
    markerElement.style.display =
      "block";

    /* =====================================================
       VÒNG TRÒN CHUYỂN ĐỘNG
    ===================================================== */

    const pulse =
      document.createElement("span");

    pulse.style.position =
      "absolute";

    pulse.style.left = "50%";

    pulse.style.bottom = "1px";

    pulse.style.width = "9px";

    pulse.style.height = "9px";

    pulse.style.border =
      "2px solid rgba(220,38,38,.55)";

    pulse.style.borderRadius =
      "50%";

    pulse.style.background =
      "rgba(220,38,38,.08)";

    pulse.style.transform =
      "translateX(-50%) scale(.65)";

    pulse.style.animation =
      "lamdongPlacePulse 1.8s ease-out infinite";

    pulse.style.pointerEvents =
      "none";

    /* =====================================================
       TÂM ĐỊNH VỊ
    ===================================================== */

    const point =
      document.createElement("span");

    point.style.position =
      "absolute";

    point.style.left = "50%";

    point.style.bottom = "3px";

    point.style.width = "4px";

    point.style.height = "4px";

    point.style.marginLeft = "-2px";

    point.style.borderRadius = "50%";

    point.style.background =
      "#dc2626";

    point.style.pointerEvents =
      "none";

    /* =====================================================
       PIN
    ===================================================== */

    const pin =
      document.createElement("span");

    pin.style.position =
      "absolute";

    pin.style.left = "50%";

    pin.style.top = "0";

    pin.style.width = "20px";

    pin.style.height = "20px";

    pin.style.background =
      "#dc2626";

    pin.style.borderRadius =
      "50% 50% 50% 0";

    pin.style.transform =
      "translateX(-50%) rotate(-45deg)";

    pin.style.boxShadow =
      "0 3px 7px rgba(127,29,29,.3)";

    pin.style.animation =
      "lamdongPlaceFloat 2.4s ease-in-out infinite";

    /* =====================================================
       CHẤM TRẮNG
    ===================================================== */

    const dot =
      document.createElement("span");

    dot.style.position =
      "absolute";

    dot.style.left = "6px";

    dot.style.top = "6px";

    dot.style.width = "8px";

    dot.style.height = "8px";

    dot.style.borderRadius =
      "50%";

    dot.style.background =
      "#ffffff";

    dot.style.transform =
      "rotate(45deg)";

    pin.appendChild(dot);

    markerElement.appendChild(
      pulse
    );

    markerElement.appendChild(
      point
    );

    markerElement.appendChild(
      pin
    );

    /* =====================================================
       CLICK MARKER
    ===================================================== */

    markerElement.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const map =
          mapRef.current;

        if (!map) return;

        /* Đóng popup cũ */

        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }

        setActivePlace(place);

        /*
         * =================================================
         * ĐƯA ĐỊA DANH VÀO GIỮA BẢN ĐỒ
         *
         * Không setCenter tức thời.
         * Dùng flyTo để chuyển động mượt.
         * =================================================
         */

        const targetZoom =
          Math.max(
            map.getZoom(),
            12.8
          );

        map.flyTo({
          center: [
            place.lng,
            place.lat,
          ],

          zoom: targetZoom,

          duration: 850,

          essential: true,
        });

        /* =================================================
           POPUP
        ================================================= */

        const popup =
          new maplibregl.Popup({
            anchor: "bottom",

            offset: 10,

            closeButton: true,

            closeOnClick: false,

            maxWidth: "280px",

            className:
              "lamdong-place-popup",

            focusAfterOpen: false,
          });

        /* =================================================
           ROOT
        ================================================= */

        const root =
          document.createElement("div");

        root.style.width = "260px";

        root.style.maxWidth =
          "calc(100vw - 40px)";

        root.style.fontFamily =
          "inherit";

        /* =================================================
           ẢNH
        ================================================= */

        if (place.image) {
          const imageWrap =
            document.createElement("div");

          imageWrap.style.width =
            "100%";

          imageWrap.style.height =
            "96px";

          imageWrap.style.borderRadius =
            "9px";

          imageWrap.style.overflow =
            "hidden";

          imageWrap.style.marginBottom =
            "8px";

          imageWrap.style.background =
            "#edf2ee";

          const image =
            document.createElement("img");

          image.src =
            place.image;

          image.alt =
            place.name;

          image.loading =
            "lazy";

          image.style.width =
            "100%";

          image.style.height =
            "100%";

          image.style.objectFit =
            "cover";

          image.style.display =
            "block";

          image.onerror = () => {
            image.style.display =
              "none";

            imageWrap.style.display =
              "flex";

            imageWrap.style.alignItems =
              "center";

            imageWrap.style.justifyContent =
              "center";

            imageWrap.textContent =
              "Chưa có hình ảnh";

            imageWrap.style.color =
              "#829087";

            imageWrap.style.fontSize =
              "10px";
          };

          imageWrap.appendChild(
            image
          );

          root.appendChild(
            imageWrap
          );
        }

        /* =================================================
           LOẠI
        ================================================= */

        const type =
          document.createElement("div");

        type.textContent =
          place.type;

        type.style.fontSize =
          "8.5px";

        type.style.fontWeight =
          "800";

        type.style.letterSpacing =
          ".06em";

        type.style.textTransform =
          "uppercase";

        type.style.color =
          "#dc2626";

        type.style.marginBottom =
          "3px";

        root.appendChild(type);

        /* =================================================
           TÊN
        ================================================= */

        const title =
          document.createElement("div");

        title.textContent =
          place.name;

        title.style.fontSize =
          "14px";

        title.style.lineHeight =
          "1.25";

        title.style.fontWeight =
          "800";

        title.style.color =
          "#173c29";

        title.style.paddingRight =
          "18px";

        title.style.marginBottom =
          "5px";

        root.appendChild(title);

        /* =================================================
           MÔ TẢ
        ================================================= */

        const summary =
          document.createElement("div");

        summary.textContent =
          place.summary;

        summary.style.fontSize =
          "10.5px";

        summary.style.lineHeight =
          "1.42";

        summary.style.color =
          "#68776e";

        summary.style.marginBottom =
          "6px";

        root.appendChild(summary);

        /* =================================================
           ĐỊA CHỈ
        ================================================= */

        const address =
          document.createElement("div");

        address.style.fontSize =
          "10px";

        address.style.lineHeight =
          "1.4";

        address.style.color =
          "#59685f";

        address.style.marginBottom =
          "7px";

        const addressLabel =
          document.createElement("span");

        addressLabel.textContent =
          "Địa chỉ: ";

        addressLabel.style.fontWeight =
          "800";

        addressLabel.style.color =
          "#dc2626";

        const addressText =
          document.createElement("span");

        addressText.textContent =
          place.address;

        address.appendChild(
          addressLabel
        );

        address.appendChild(
          addressText
        );

        root.appendChild(address);

        /* =================================================
           ACTIONS
        ================================================= */

        const actions =
          document.createElement("div");

        actions.style.display =
          "flex";

        actions.style.alignItems =
          "center";

        actions.style.justifyContent =
          "space-between";

        actions.style.gap =
          "6px";

        actions.style.borderTop =
          "1px solid #edf1ed";

        actions.style.paddingTop =
          "6px";

        /* Google Maps */

        const directions =
          document.createElement("a");

        directions.href =
          place.googleMapsUrl;

        directions.target =
          "_blank";

        directions.rel =
          "noopener noreferrer";

        directions.textContent =
          "↗ Đường đi";

        directions.style.fontSize =
          "10.5px";

        directions.style.fontWeight =
          "800";

        directions.style.color =
          "#1d6b42";

        directions.style.textDecoration =
          "none";

        /* Chi tiết */

        const detailButton =
          document.createElement("button");

        detailButton.type =
          "button";

        detailButton.textContent =
          "Xem chi tiết";

        detailButton.style.border =
          "0";

        detailButton.style.borderRadius =
          "7px";

        detailButton.style.background =
          "#0b7a45";

        detailButton.style.color =
          "#ffffff";

        detailButton.style.padding =
          "6px 9px";

        detailButton.style.fontSize =
          "10px";

        detailButton.style.fontWeight =
          "700";

        detailButton.style.cursor =
          "pointer";

        detailButton.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            popup.remove();

            if (
              popupRef.current ===
              popup
            ) {
              popupRef.current =
                null;
            }

            openPlaceDetail(
              place
            );
          }
        );

        actions.appendChild(
          directions
        );

        actions.appendChild(
          detailButton
        );

        root.appendChild(actions);

        /* =================================================
           GẮN POPUP ĐÚNG TỌA ĐỘ ĐỊA DANH
        ================================================= */

        popup
          .setLngLat([
            place.lng,
            place.lat,
          ])
          .setDOMContent(root)
          .addTo(map);

        popupRef.current =
          popup;
      }
    );

    return markerElement;
  }

  /* =======================================================
     HIỂN THỊ MARKER CỦA XÃ ĐANG CHỌN
  ======================================================= */

  function showPlaceMarkers(
    wardName: string
  ) {
    const map =
      mapRef.current;

    if (!map) return;

    clearPlaceMarkers();

    const normalizedWard =
      normalizeText(wardName);

    const places =
      DEMO_PLACES.filter(
        (place) =>
          normalizedWard.includes(
            normalizeText(
              place.wardKeyword
            )
          )
      );

    places.forEach((place) => {
      const markerElement =
        createPlaceMarker(
          place
        );

      const marker =
        new maplibregl.Marker({
          element:
            markerElement,
          anchor: "bottom",
        })
          .setLngLat([
            place.lng,
            place.lat,
          ])
          .addTo(map);

      markersRef.current.push(
        marker
      );
    });
  }

  /* =======================================================
     TÌM KIẾM
  ======================================================= */

  const filteredWards =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return wards;
      }

      return wards.filter(
        (ward) => {
          const name =
            String(
              ward.properties
                ?.name || ""
            ).toLowerCase();

          const fullName =
            String(
              ward.properties
                ?.fullName || ""
            ).toLowerCase();

          const type =
            String(
              ward.properties
                ?.type || ""
            ).toLowerCase();

          return (
            name.includes(
              keyword
            ) ||
            fullName.includes(
              keyword
            ) ||
            type.includes(
              keyword
            )
          );
        }
      );
    }, [wards, search]);

  /* =======================================================
     GROUP XÃ / PHƯỜNG / ĐẶC KHU
  ======================================================= */

  const groupedWards =
    useMemo(() => {
      const groups: Record<
        string,
        WardFeature[]
      > = {
        Phường: [],
        Xã: [],
        "Đặc khu": [],
      };

      for (const ward of filteredWards) {
        const type =
          String(
            ward.properties
              ?.type || ""
          ).trim();

        if (type === "Phường") {
          groups.Phường.push(
            ward
          );
        } else if (
          type === "Đặc khu"
        ) {
          groups["Đặc khu"].push(
            ward
          );
        } else {
          groups.Xã.push(
            ward
          );
        }
      }

      return groups;
    }, [filteredWards]);

  /* =======================================================
     HOVER
  ======================================================= */

  function highlightHover(
    name: string
  ) {
    const map =
      mapRef.current;

    if (!map) return;

    if (
      !map.getLayer(
        "lamdong-hover"
      )
    ) {
      return;
    }

    map.setFilter(
      "lamdong-hover",
      [
        "==",
        ["get", "name"],
        name,
      ]
    );

    map.setFilter(
      "lamdong-hover-border",
      [
        "==",
        ["get", "name"],
        name,
      ]
    );
  }

  function clearHover() {
    const map =
      mapRef.current;

    if (!map) return;

    if (
      !map.getLayer(
        "lamdong-hover"
      )
    ) {
      return;
    }

    map.setFilter(
      "lamdong-hover",
      [
        "==",
        ["get", "name"],
        "",
      ]
    );

    map.setFilter(
      "lamdong-hover-border",
      [
        "==",
        ["get", "name"],
        "",
      ]
    );
  }

  /* =======================================================
     SELECTED
  ======================================================= */

  function highlightSelected(
    name: string
  ) {
    const map =
      mapRef.current;

    if (!map) return;

    if (
      !map.getLayer(
        "lamdong-selected"
      )
    ) {
      return;
    }

    map.setFilter(
      "lamdong-selected",
      [
        "==",
        ["get", "name"],
        name,
      ]
    );

    map.setFilter(
      "lamdong-selected-border",
      [
        "==",
        ["get", "name"],
        name,
      ]
    );
  }

  function clearSelected() {
    const map =
      mapRef.current;

    if (!map) return;

    if (
      !map.getLayer(
        "lamdong-selected"
      )
    ) {
      return;
    }

    map.setFilter(
      "lamdong-selected",
      [
        "==",
        ["get", "name"],
        "",
      ]
    );

    map.setFilter(
      "lamdong-selected-border",
      [
        "==",
        ["get", "name"],
        "",
      ]
    );
  }

  /* =======================================================
     VỀ KHUNG BAN ĐẦU
  ======================================================= */

  function goToInitialView() {
    const map =
      mapRef.current;

    if (!map) return;

    map.flyTo({
      center:
        INITIAL_CENTER,

      zoom:
        INITIAL_ZOOM,

      duration: 850,

      essential: true,
    });
  }

  /* =======================================================
     BỎ CHỌN
  ======================================================= */

  function clearSelection() {
    selectedRef.current =
      null;

    setSelected(null);
    setHoveredName("");

    clearHover();
    clearSelected();
    clearPlaceMarkers();
  }

  /* =======================================================
     CHỌN XÃ
  ======================================================= */

  function selectWard(
    feature: WardFeature
  ) {
    const map =
      mapRef.current;

    if (!map) return;

    const name =
      String(
        feature.properties
          ?.name || ""
      ).trim();

    const type =
      String(
        feature.properties
          ?.type || ""
      ).trim();

    if (!name) return;

    const selectedWard: SelectedWard =
      {
        name,
        type,
      };

    selectedRef.current =
      selectedWard;

    setSelected(
      selectedWard
    );

    setHoveredName("");

    clearHover();
    clearPlaceMarkers();

    highlightSelected(
      name
    );

    const bounds =
      getBoundsForFeature(
        feature
      );

    if (!bounds.isEmpty()) {
      map.fitBounds(
        bounds,
        {
          padding: 80,
          maxZoom: 11.5,
          duration: 900,
          essential: true,
        }
      );
    }

    setShowList(false);
    setSearch("");

    window.setTimeout(
      () => {
        if (
          selectedRef.current
            ?.name === name
        ) {
          showPlaceMarkers(
            name
          );
        }
      },
      650
    );
  }

  /* =======================================================
     KHỞI TẠO MAP
  ======================================================= */

  useEffect(() => {
    if (!mapEl.current) {
      return;
    }

    let cancelled =
      false;

    async function initMap() {
      try {
        const response =
          await fetch(
            "/data/lam-dong-124-xa.geojson"
          );

        if (!response.ok) {
          throw new Error(
            "Không thể tải dữ liệu 124 xã, phường, đặc khu."
          );
        }

        const wardData =
          (await response.json()) as WardCollection;

        if (cancelled) {
          return;
        }

        wardsRef.current =
          wardData.features;

        setWards(
          wardData.features
        );

        const map =
          new maplibregl.Map({
            container:
              mapEl.current!,

            center:
              INITIAL_CENTER,

            zoom:
              INITIAL_ZOOM,

            minZoom: 6,

            maxZoom: 15,

            style: {
              version: 8,

              sources: {
                provinces: {
                  type: "geojson",

                  data:
                    "/data/provinces/vietnam-34-tinh-named.geojson",
                },

                lamdong: {
                  type: "geojson",

                  data:
                    wardData as any,
                },

                surroundingWards: {
                  type: "geojson",

                  data:
                    "/data/provinces/surrounding-wards.geojson",
                },
              },

              layers: [
                {
                  id: "background",

                  type: "background",

                  paint: {
                    "background-color":
                      "#eef3ef",
                  },
                },

                {
                  id: "outside-provinces-fill",

                  type: "fill",

                  source:
                    "provinces",

                  filter: [
                    "!=",
                    ["get", "name"],
                    "Lâm Đồng",
                  ],

                  paint: {
                    "fill-color": [
                      "match",
                      ["get", "name"],
                      ...Object.entries(
                        OUTSIDE_COLORS
                      ).flat(),
                      "#edf1ee",
                    ],

                    "fill-opacity":
                      0.88,
                  },
                },

                {
                  id: "outside-provinces-border",

                  type: "line",

                  source:
                    "provinces",

                  filter: [
                    "!=",
                    ["get", "name"],
                    "Lâm Đồng",
                  ],

                  paint: {
                    "line-color":
                      "#aab8b0",

                    "line-width": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      6,
                      0.7,
                      8,
                      1.1,
                      11,
                      1.5,
                    ],
                  },
                },

                {
                  id: "outside-provinces-labels",

                  type: "symbol",

                  source:
                    "provinces",

                  filter: [
                    "!=",
                    ["get", "name"],
                    "Lâm Đồng",
                  ],

                  layout: {
                    "text-field": [
                      "get",
                      "name",
                    ],

                    "text-size": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      6,
                      10,
                      7,
                      11,
                      8,
                      12,
                      10,
                      14,
                    ],

                    "text-anchor":
                      "center",

                    "text-allow-overlap":
                      false,

                    "text-ignore-placement":
                      false,
                  },

                  paint: {
                    "text-color":
                      "#52655b",

                    "text-halo-color":
                      "#ffffff",

                    "text-halo-width":
                      2,

                    "text-halo-blur":
                      0.3,
                  },
                },

                {
                  id: "surrounding-wards-fill",

                  type: "fill",

                  source:
                    "surroundingWards",

                  filter: [
                    "!=",
                    ["get", "isLamDong"],
                    true,
                  ],

                  paint: {
                    "fill-color":
                      "#f5f6f3",

                    "fill-opacity":
                      0.18,
                  },

                  minzoom: 8.2,
                },

                {
                  id: "surrounding-wards-border",

                  type: "line",

                  source:
                    "surroundingWards",

                  filter: [
                    "!=",
                    ["get", "isLamDong"],
                    true,
                  ],

                  paint: {
                    "line-color":
                      "#b9c4bd",

                    "line-width": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      8,
                      0.25,
                      9,
                      0.55,
                      11,
                      0.9,
                      13,
                      1.2,
                    ],

                    "line-opacity":
                      0.65,
                  },

                  minzoom: 8,
                },

                {
                  id: "surrounding-wards-labels",

                  type: "symbol",

                  source:
                    "surroundingWards",

                  filter: [
                    "!=",
                    ["get", "isLamDong"],
                    true,
                  ],

                  layout: {
                    "text-field": [
                      "get",
                      "name",
                    ],

                    "text-size": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      9,
                      8,
                      10,
                      9,
                      11,
                      10,
                      13,
                      12,
                    ],

                    "text-anchor":
                      "center",

                    "text-allow-overlap":
                      false,

                    "text-ignore-placement":
                      true,
                  },

                  paint: {
                    "text-color":
                      "#78857e",

                    "text-halo-color":
                      "#ffffff",

                    "text-halo-width":
                      1.2,

                    "text-halo-blur":
                      0.2,
                  },

                  minzoom: 9,
                },

                {
                  id: "lamdong-fill",

                  type: "fill",

                  source:
                    "lamdong",

                  paint: {
                    "fill-color":
                      buildWardColorExpression(
                        wardData.features
                      ),

                    "fill-opacity":
                      0.96,
                  },
                },

                {
                  id: "lamdong-border",

                  type: "line",

                  source:
                    "lamdong",

                  paint: {
                    "line-color":
                      "#5F7F6A",

                    "line-width": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      6,
                      0.65,
                      7,
                      0.9,
                      9,
                      1.2,
                      12,
                      1.7,
                    ],
                  },
                },

                {
                  id: "lamdong-labels",

                  type: "symbol",

                  source:
                    "lamdong",

                  layout: {
                    "text-field": [
                      "get",
                      "name",
                    ],

                    "symbol-placement":
                      "point",

                    "text-size": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      7.5,
                      8,
                      8,
                      9,
                      9,
                      10,
                      10,
                      11,
                      12,
                      14,
                    ],

                    "text-anchor":
                      "center",

                    "text-allow-overlap":
                      false,

                    "text-ignore-placement":
                      false,

                    "symbol-sort-key":
                      5,
                  },

                  paint: {
                    "text-color":
                      "#155b39",

                    "text-halo-color":
                      "#ffffff",

                    "text-halo-width":
                      1.6,

                    "text-halo-blur":
                      0.2,
                  },

                  minzoom: 7.5,
                },

                {
                  id: "lamdong-hover",

                  type: "fill",

                  source:
                    "lamdong",

                  paint: {
                    "fill-color":
                      "#F5C842",

                    "fill-opacity":
                      0.58,
                  },

                  filter: [
                    "==",
                    ["get", "name"],
                    "",
                  ],
                },

                {
                  id: "lamdong-hover-border",

                  type: "line",

                  source:
                    "lamdong",

                  paint: {
                    "line-color":
                      "#C98C00",

                    "line-width": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      6,
                      2,
                      8,
                      3,
                      11,
                      4.5,
                    ],
                  },

                  filter: [
                    "==",
                    ["get", "name"],
                    "",
                  ],
                },

                {
                  id: "lamdong-selected",

                  type: "fill",

                  source:
                    "lamdong",

                  paint: {
                    "fill-color":
                      "#F5C842",

                    "fill-opacity":
                      0.78,
                  },

                  filter: [
                    "==",
                    ["get", "name"],
                    "",
                  ],
                },

                {
                  id: "lamdong-selected-border",

                  type: "line",

                  source:
                    "lamdong",

                  paint: {
                    "line-color":
                      "#C98C00",

                    "line-width": [
                      "interpolate",
                      ["linear"],
                      ["zoom"],
                      6,
                      2.5,
                      8,
                      3.5,
                      11,
                      5,
                    ],
                  },

                  filter: [
                    "==",
                    ["get", "name"],
                    "",
                  ],
                },
              ],
            },
          });

        mapRef.current =
          map;

        map.on(
          "error",
          (event) => {
            console.error(
              "MAP ERROR:",
              event.error
            );
          }
        );

        map.on(
          "load",
          () => {
            console.log(
              "LÂM ĐỒNG MAP: OK"
            );

            /* Hover */

            map.on(
              "mousemove",
              "lamdong-fill",
              (event) => {
                const feature =
                  event.features?.[0];

                if (!feature) {
                  return;
                }

                const name =
                  String(
                    feature
                      .properties
                      ?.name || ""
                  );

                if (!name) {
                  return;
                }

                setHoveredName(
                  name
                );

                highlightHover(
                  name
                );

                map.getCanvas().style.cursor =
                  "pointer";
              }
            );

            map.on(
              "mouseleave",
              "lamdong-fill",
              () => {
                setHoveredName(
                  ""
                );

                clearHover();

                map.getCanvas().style.cursor =
                  "";

                if (
                  selectedRef
                    .current
                    ?.name
                ) {
                  highlightSelected(
                    selectedRef
                      .current
                      .name
                  );
                }
              }
            );

            /* Click xã */

            map.on(
              "click",
              "lamdong-fill",
              (event) => {
                const feature =
                  event.features?.[0];

                if (!feature) {
                  return;
                }

                const name =
                  String(
                    feature
                      .properties
                      ?.name || ""
                  );

                if (!name) {
                  return;
                }

                const localFeature =
                  wardsRef.current.find(
                    (ward) =>
                      String(
                        ward
                          .properties
                          ?.name || ""
                      ) === name
                  );

                if (!localFeature) {
                  return;
                }

                selectWard(
                  localFeature
                );
              }
            );
          }
        );
      } catch (error) {
        console.error(
          "LÂM ĐỒNG MAP INIT ERROR:",
          error
        );
      }
    }

    initMap();

    return () => {
      cancelled = true;

      clearPlaceMarkers();

      if (mapRef.current) {
        mapRef.current.remove();

        mapRef.current =
          null;
      }
    };
  }, []);

  /* =======================================================
     ĐỒNG BỘ SELECTED
  ======================================================= */

  useEffect(() => {
    selectedRef.current =
      selected;

    if (
      selected?.name &&
      !hoveredName
    ) {
      highlightSelected(
        selected.name
      );
    }
  }, [
    selected,
    hoveredName,
  ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#eef3ef]">

      <style jsx global>{`

        /* =================================================
           MARKER
        ================================================= */

        @keyframes lamdongPlaceFloat {
          0%,
          100% {
            margin-top: 0;
          }

          50% {
            margin-top: -2px;
          }
        }

        /* =================================================
           VÒNG TRÒN ĐỊNH VỊ
        ================================================= */

        @keyframes lamdongPlacePulse {
          0% {
            transform:
              translateX(-50%)
              scale(.65);

            opacity: .7;
          }

          65% {
            transform:
              translateX(-50%)
              scale(2);

            opacity: 0;
          }

          100% {
            transform:
              translateX(-50%)
              scale(2);

            opacity: 0;
          }
        }

        /* =================================================
           POPUP
        ================================================= */

        .lamdong-place-popup
          .maplibregl-popup-content {
          width: 280px;

          max-width:
            calc(100vw - 40px);

          padding: 9px;

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              .98
            );

          border:
            1px solid
            rgba(
              218,
              230,
              221,
              .95
            );

          box-shadow:
            0 10px 30px
            rgba(
              25,
              65,
              43,
              .20
            );
        }

        .lamdong-place-popup
          .maplibregl-popup-tip {
          border-top-color:
            #ffffff;
        }

        .lamdong-place-popup
          .maplibregl-popup-close-button {
          width: 24px;

          height: 24px;

          top: 4px;

          right: 4px;

          border-radius: 50%;

          font-size: 16px;

          line-height: 23px;

          color:
            #718078;

          z-index: 10;
        }

        .lamdong-place-popup
          .maplibregl-popup-close-button:hover {
          background:
            #f1f5f2;

          color:
            #173c29;
        }

        /* =================================================
           MOBILE
        ================================================= */

        @media (max-width: 640px) {

          .lamdong-place-popup
            .maplibregl-popup-content {
            width: 260px;

            max-width:
              calc(100vw - 28px);

            padding: 8px;

            border-radius:
              11px;
          }

        }

      `}</style>

      {/* ===================================================
          DANH SÁCH 124 ĐƠN VỊ
      =================================================== */}

      <div className="absolute left-1 top-1 z-30">

        <button
          type="button"
          onClick={() => {
            setShowList(
              (value) => !value
            );

            if (!showList) {
              setSearch("");
            }
          }}
          className="group flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-2.5 py-2 text-sm font-semibold text-[#28543b] shadow-[0_10px_35px_rgba(25,65,43,0.16)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
        >

          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5f3e8]">

            <span className="absolute inset-0 animate-ping rounded-full bg-[#7fbe91]/30" />

            <List
              size={10}
              className="relative z-10 text-[#28724b]"
            />

          </span>

          <span className="whitespace-nowrap">
            124 xã, phường, đặc khu
          </span>

          {showList ? (
            <ChevronUp
              size={10}
              className="text-[#28724b]"
            />
          ) : (
            <ChevronDown
              size={10}
              className="animate-bounce text-[#28724b]"
            />
          )}

        </button>

        {showList && (
          <div className="absolute left-0 mt-2 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/80 bg-white/97 shadow-[0_15px_45px_rgba(25,65,43,0.2)] backdrop-blur">

            <div className="border-b border-[#edf1ed] p-3">

              <div className="flex items-center gap-2 rounded-xl border border-[#dfeae2] bg-[#f8fbf8] px-3">

                <Search
                  size={17}
                  className="shrink-0 text-[#28724b]"
                />

                <input
                  autoFocus
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tìm xã, phường, đặc khu..."
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[#173c29] outline-none placeholder:text-[#8a9a91]"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="rounded-full p-1 text-[#73837a] hover:bg-[#edf5ef]"
                  >
                    <X size={15} />
                  </button>
                )}

              </div>

              <div className="mt-2 px-1 text-[11px] text-[#849189]">
                Chọn địa phương để xem trên bản đồ
              </div>

            </div>

            <div className="max-h-[440px] overflow-y-auto p-2">

              {filteredWards.length ===
              0 ? (
                <div className="px-3 py-8 text-center text-xs text-[#7b8b82]">
                  Không tìm thấy địa danh.
                </div>
              ) : (
                Object.entries(
                  groupedWards
                ).map(
                  ([type, items]) =>
                    items.length > 0 && (
                      <div
                        key={type}
                        className="mb-3"
                      >

                        <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b8c82]">
                          {type} ·{" "}
                          {items.length}
                        </div>

                        <div className="grid grid-cols-1 gap-0.5">

                          {items.map(
                            (
                              ward,
                              index
                            ) => {

                              const name =
                                String(
                                  ward
                                    .properties
                                    ?.name ||
                                    ""
                                );

                              const isSelected =
                                selected
                                  ?.name ===
                                name;

                              return (
                                <button
                                  key={`${name}-${index}`}
                                  type="button"
                                  onClick={() =>
                                    selectWard(
                                      ward
                                    )
                                  }
                                  onMouseEnter={() =>
                                    highlightHover(
                                      name
                                    )
                                  }
                                  onMouseLeave={() => {
                                    clearHover();

                                    if (
                                      selectedRef
                                        .current
                                        ?.name
                                    ) {
                                      highlightSelected(
                                        selectedRef
                                          .current
                                          .name
                                      );
                                    }
                                  }}
                                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                    isSelected
                                      ? "bg-[#e6f3e9] font-bold text-[#17623b]"
                                      : "text-[#52645a] hover:bg-[#f0f6f1]"
                                  }`}
                                >

                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-sm"
                                    style={{
                                      backgroundColor:
                                        PLACE_COLORS[
                                          getColorIndex(
                                            name
                                          )
                                        ],
                                    }}
                                  />

                                  <span className="truncate">
                                    {name}
                                  </span>

                                  {isSelected && (
                                    <MapPin
                                      size={13}
                                      className="ml-auto shrink-0 text-[#26734a]"
                                    />
                                  )}

                                </button>
                              );
                            }
                          )}

                        </div>

                      </div>
                    )
                )
              )}

            </div>
          </div>
        )}

      </div>

      {/* ===================================================
          XÃ ĐANG CHỌN
      =================================================== */}

      {selected && (
        <div className="absolute bottom-4 left-3 z-20 max-w-[calc(100%-68px)]">

          <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/96 px-4 py-3 shadow-[0_10px_35px_rgba(25,65,43,0.18)] backdrop-blur">

            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0f0] text-[#d62828]">

              <span className="absolute inset-0 animate-ping rounded-full bg-[#ef4444]/30" />

              <MapPin
                size={17}
                className="relative z-10"
              />

            </div>

            <div className="min-w-0">

              <div className="truncate text-sm font-bold text-[#1f4e34]">
                {selected.name}
              </div>

              <div className="text-[11px] text-[#7d8c84]">
                {selected.type} · Đang chọn
              </div>

            </div>

            <button
              type="button"
              onClick={
                clearSelection
              }
              title="Bỏ chọn địa phương"
              className="rounded-full p-1.5 text-[#7b8b82] hover:bg-[#edf5ef]"
            >
              <X size={15} />
            </button>

          </div>

        </div>
      )}

      {/* ===================================================
          MAP
      =================================================== */}

      <div
        ref={mapEl}
        className="h-full w-full"
      />

      {/* ===================================================
          NÚT ĐIỀU KHIỂN
      =================================================== */}

      <div className="absolute right-3 top-3 z-40 sm:right-4 sm:top-4">

        <div className="overflow-hidden rounded-xl border border-[#d8e6dc] bg-white/95 shadow-lg backdrop-blur">

          <button
            type="button"
            onClick={
              goToInitialView
            }
            title="Về khung bản đồ ban đầu"
            aria-label="Về khung bản đồ ban đầu"
            className="flex h-10 w-10 cursor-pointer items-center justify-center border-b border-[#d8e6dc] text-[#315F45] transition hover:bg-[#f1f7f2]"
          >
            <Home size={18} />
          </button>

          <button
            type="button"
            onClick={() =>
              mapRef.current?.zoomIn()
            }
            title="Phóng to"
            aria-label="Phóng to"
            className="flex h-10 w-10 cursor-pointer items-center justify-center border-b border-[#d8e6dc] text-[#315F45] transition hover:bg-[#f1f7f2]"
          >
            <span className="text-xl leading-none">
              +
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              mapRef.current?.zoomOut()
            }
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
            className="flex h-10 w-10 cursor-pointer items-center justify-center text-[#315F45] transition hover:bg-[#f1f7f2]"
          >
            <span className="text-xl leading-none">
              −
            </span>
          </button>

        </div>

      </div>

    </div>
  );
}