import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Check, Trash2, Plus, CheckSquare } from 'lucide-react';

export default function SidebarNotes() {
  // Mặc định hiển thị note list mở rộng theo toàn bộ chiều dọc
  const [isOpen, setIsOpen] = useState(true);
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('soc_quick_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [
      { id: '1', text: 'Kiểm tra IP độc hại 103.11.22.33', completed: false },
      { id: '2', text: 'Kích hoạt thử Playbook Phishing', completed: true },
      { id: '3', text: 'Rà soát cấu hình n8n Webhook', completed: false }
    ];
  });

  const [newText, setNewText] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    localStorage.setItem('soc_quick_notes', JSON.stringify(notes));
  }, [notes]);

  // Đổi trạng thái hoàn thành (kích hoạt gạch ngang từ từ)
  const toggleComplete = (id) => {
    setNotes(prev => prev.map(note => {
      if (note.id === id) {
        return { ...note, completed: !note.completed };
      }
      return note;
    }));
  };

  // Thêm note mới
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      text: newText.trim(),
      completed: false
    };
    setNotes(prev => [...prev, newNote]);
    setNewText('');
  };

  // Xóa note với animation trượt ra và biến mất, đẩy note dưới lên
  const handleDeleteNote = (id) => {
    setDeletingId(id);
    setTimeout(() => {
      setNotes(prev => prev.filter(note => note.id !== id));
      setDeletingId(null);
    }, 280);
  };

  const pendingCount = notes.filter(n => !n.completed).length;

  return (
    <div className={`w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 transition-all duration-300 overflow-hidden shadow-sm flex flex-col ${
      isOpen ? 'h-full' : ''
    }`}>
      
      {/* HEADER: DẤU MŨI TÊN (ẤN VÀO ĐÓNG / MỞ) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer select-none text-left shrink-0 border-b border-slate-200/60 dark:border-slate-800/60"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <CheckSquare size={13} />
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
            Ghi Chú Nhanh
          </span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {pendingCount}
            </span>
          )}
        </div>

        {/* Icon mũi tên đảo chiều */}
        <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200">
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {/* DANH SÁCH NOTE (KÉO DÀI CHIỀU DỌC THEO KHUNG CONTAINER) */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 px-3 pb-3 pt-2">
          {/* Danh sách cuộn nhẹ nhàng chiếm trọn không gian trống */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 min-h-0">
            {notes.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-6">
                Chưa có ghi chú nào. Hãy thêm ở dưới!
              </div>
            ) : (
              notes.map(note => {
                const isDeleting = deletingId === note.id;
                return (
                  <div
                    key={note.id}
                    className={`group flex items-start justify-between gap-2 p-1.5 rounded-lg border border-slate-300/80 dark:border-slate-800/80 bg-white dark:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs ${
                      isDeleting ? 'animate-note-remove' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0 pt-0.5">
                      {/* Ô vuông Tick Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleComplete(note.id)}
                        className={`w-3.5 h-3.5 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer ${
                          note.completed
                            ? 'bg-neutral-900 dark:bg-cyan-500 border-neutral-900 dark:border-cyan-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400'
                        }`}
                      >
                        {note.completed && <Check size={10} strokeWidth={3} />}
                      </button>

                      {/* Nội dung Note kèm Animation Gạch Ngang từ từ */}
                      <span
                        onClick={() => toggleComplete(note.id)}
                        className={`text-[11px] leading-snug break-words cursor-pointer select-none transition-colors duration-200 ${
                          note.completed
                            ? 'text-slate-400 dark:text-slate-500 strikethrough-anim'
                            : 'text-slate-700 dark:text-slate-200 font-medium'
                        }`}
                      >
                        {note.text}
                      </span>
                    </div>

                    {/* Nút Delete riêng cho mỗi Note */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      title="Xóa ghi chú này"
                      className="opacity-40 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-opacity cursor-pointer shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* FORM THÊM NOTE Ở DƯỚI CÙNG */}
          <form onSubmit={handleAddNote} className="mt-2.5 flex items-center gap-1.5 shrink-0 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Thêm việc cần làm..."
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-[11px] placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 transition"
            />
            <button
              type="submit"
              disabled={!newText.trim()}
              title="Thêm ghi chú"
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white transition disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
