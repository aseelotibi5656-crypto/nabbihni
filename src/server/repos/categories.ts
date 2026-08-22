import 'server-only';
import { db, bool, int } from '../db/client';
import { newId, nowIso } from '../db/ids';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { HttpError } from '../api/http';
import type { Category } from '@/lib/types';

export function listCategories(userId: string): Category[] {
  const rows = db.all<{
    id: string;
    name: string;
    color: string;
    icon: string;
    is_system: number;
    sort_order: number;
    task_count: number;
  }>(
    `SELECT c.id, c.name, c.color, c.icon, c.is_system, c.sort_order,
            (SELECT COUNT(*) FROM tasks t WHERE t.category_id = c.id AND t.status != 'archived') AS task_count
     FROM categories c WHERE c.user_id = ? ORDER BY c.sort_order ASC, c.name ASC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    isSystem: bool(r.is_system),
    sortOrder: r.sort_order,
    taskCount: Number(r.task_count ?? 0),
  }));
}

export function createCategory(
  userId: string,
  input: { name: string; color?: string; icon?: string },
  isSystem = false,
): Category {
  const exists = db.get('SELECT id FROM categories WHERE user_id = ? AND name = ?', [
    userId,
    input.name.trim(),
  ]);
  if (exists) throw new HttpError(409, 'conflict', 'يوجد تصنيف بنفس الاسم بالفعل.');

  const id = newId('cat_');
  const order = db.get<{ n: number }>(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM categories WHERE user_id = ?',
    [userId],
  );
  db.run(
    `INSERT INTO categories (id, user_id, name, color, icon, is_system, sort_order, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, userId, input.name.trim(), input.color ?? 'indigo', input.icon ?? 'folder', int(isSystem), Number(order?.n ?? 0), nowIso()],
  );
  return listCategories(userId).find((c) => c.id === id)!;
}

export function updateCategory(
  userId: string,
  id: string,
  input: { name?: string; color?: string; icon?: string },
): Category | null {
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (input.name !== undefined) {
    sets.push('name = ?');
    params.push(input.name.trim());
  }
  if (input.color !== undefined) {
    sets.push('color = ?');
    params.push(input.color);
  }
  if (input.icon !== undefined) {
    sets.push('icon = ?');
    params.push(input.icon);
  }
  if (!sets.length) return listCategories(userId).find((c) => c.id === id) ?? null;

  db.run(`UPDATE categories SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, [...params, id, userId]);
  return listCategories(userId).find((c) => c.id === id) ?? null;
}

export function deleteCategory(userId: string, id: string): boolean {
  // المهام المرتبطة تبقى، ويصبح تصنيفها فارغاً (ON DELETE SET NULL)
  return Number(db.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]).changes) > 0;
}

/** إنشاء التصنيفات الجاهزة لمستخدم جديد */
export function seedDefaultCategories(userId: string) {
  DEFAULT_CATEGORIES.forEach((cat, index) => {
    db.run(
      `INSERT OR IGNORE INTO categories (id, user_id, name, color, icon, is_system, sort_order, created_at)
       VALUES (?,?,?,?,?,1,?,?)`,
      [newId('cat_'), userId, cat.name, cat.color, cat.icon, index, nowIso()],
    );
  });
}
