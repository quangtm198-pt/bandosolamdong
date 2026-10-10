
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Edit3, MapPin, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Ward = {
  id: string;
  name: string;
  type: string | null;
  code: string | null;
  introduction: string | null;
};

const inputClass =
  "w-full rounded-xl border border-[#d7e4dc] bg-white px-3 py-2.5 text-sm text-[#29483a] outline-none transition focus:border-[#15945b] focus:ring-2 focus:ring-[#15945b]/10";

export default function WardIntroductionManager() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Ward | null>(null);
  const [introduction, setIntroduction] = useState("");
  const [saving, setSaving] = useState(false);

  const loadWards = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("wards")
      .select("id,name,type,code,introduction")
      .eq("province_code", "68")
      .order("name");

    if (error) {
      alert(`Không tải được địa bàn: ${error.message}`);
    } else {
      setWards((data || []) as Ward[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadWards();
  }, [loadWards]);

  const filtered = wards.filter((ward) =>
    ward.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")),
  );

  async function saveIntroduction() {
    if (!editing || saving) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("wards")
        .update({
          introduction: introduction.trim() || null,
        })
        .eq("id", editing.id);

      if (error) {
        alert(`Không lưu được phần giới thiệu: ${error.message}`);
        return;
      }

      setWards((current) =>
        current.map((ward) =>
          ward.id === editing.id
            ? { ...ward, introduction: introduction.trim() || null }
            : ward,
        ),
      );

      setEditing(null);
      setIntroduction("");
      alert("Đã lưu phần giới thiệu địa bàn.");
    } catch (error) {
      console.error("Lỗi lưu giới thiệu địa bàn:", error);
      alert("Có lỗi khi lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#dce8e0] bg-white shadow-sm">
      <div className="border-b border-[#edf2ee] px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold text-[#315747]">
          Giới thiệu xã, phường, đặc khu
        </h2>
        <p className="mt-1 text-xs leading-5 text-[#87978e]">
          Quản lý nội dung giới thiệu vùng đất, lịch sử, văn hóa và những giá trị
          tiêu biểu của từng địa bàn.
        </p>

        <div className="relative mt-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#93a29b]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm xã, phường, đặc khu..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-[#87978e]">
          Đang tải danh sách địa bàn...
        </p>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-[#87978e]">
          Không tìm thấy địa bàn phù hợp.
        </p>
      ) : (
        <div className="divide-y divide-[#edf2ee]">
          {filtered.map((ward) => (
            <div
              key={ward.id}
              className="flex flex-col gap-3 px-4 py-4 transition hover:bg-[#f8fbf9] sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-xl bg-[#edf6f0] p-2 text-[#087b4c]">
                  <MapPin size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#315747]">
                    {ward.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7a8c82]">
                    {ward.introduction || "Chưa cập nhật thông tin giới thiệu."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditing(ward);
                  setIntroduction(ward.introduction || "");
                }}
                className="flex shrink-0 items-center justify-center gap-2 self-end rounded-xl border border-[#d7e4dc] px-3 py-2 text-xs font-semibold text-[#087b4c] transition hover:border-[#087b4c] hover:bg-[#edf6f0] sm:self-center"
              >
                <Edit3 size={14} />
                {ward.introduction ? "Chỉnh sửa" : "Nhập giới thiệu"}
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#19362a]/50 p-3 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[#dce8e0] bg-[#f8faf8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dce8e0] bg-white px-4 py-4 sm:px-5">
              <div>
                <h3 className="text-sm font-bold text-[#087b4c]">
                  Giới thiệu {editing.name}
                </h3>
                <p className="mt-1 text-xs text-[#87978e]">
                  Nội dung sẽ được lưu theo địa bàn đã chọn.
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-lg p-2 text-[#72857b] hover:bg-[#eef3ef]"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              <label className="mb-2 block text-xs font-semibold text-[#536c60]">
                Nội dung giới thiệu
              </label>
              <textarea
                value={introduction}
                onChange={(event) => setIntroduction(event.target.value)}
                rows={10}
                maxLength={20000}
                placeholder={`Ví dụ: ${editing.name} là vùng đất có những giá trị lịch sử, văn hóa và cảnh quan đặc trưng... Hãy nhập nội dung đã được kiểm chứng.`}
                className={`${inputClass} resize-y leading-7`}
              />
              <p className="mt-2 text-[11px] text-[#87978e]">
                Có thể nhập nhiều đoạn văn. Để trống nếu chưa có nội dung được
                xác minh.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#dce8e0] bg-white px-4 py-4 sm:px-5">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-xl border border-[#d5e1da] px-4 py-2.5 text-xs font-semibold text-[#687b71] hover:bg-[#f3f7f4]"
              >
                Hủy
              </button>
              <button
                onClick={() => void saveIntroduction()}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#087b4c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#06683f] disabled:opacity-60"
              >
                <Check size={15} />
                {saving ? "Đang lưu..." : "Lưu giới thiệu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}