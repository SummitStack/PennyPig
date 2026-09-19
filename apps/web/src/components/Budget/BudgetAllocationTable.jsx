import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import {
  buildCategoryTree,
  getCategoryRole,
  isBudgetParent,
} from '../../lib/categories'
import CategoryForm from '../Categories/CategoryForm'
import Icon from '../ui/Icon'

function statusDot(budgeted, activity) {
  if (budgeted === 0 && activity === 0) return 'bg-outline-variant'
  if (activity > budgeted) return 'bg-status-error'
  if (budgeted > 0 && activity / budgeted > 0.85) return 'bg-status-warning'
  return 'bg-status-success'
}

function statusText(budgeted, activity) {
  if (activity > budgeted) return 'text-status-error'
  if (budgeted > 0 && activity / budgeted > 0.85) return 'text-status-warning'
  if (budgeted === 0) return 'text-on-surface-variant'
  return 'text-status-success'
}

function MoneyCell({
  categoryId,
  budgeted,
  editable,
  editingCell,
  editValue,
  setEditingCell,
  setEditValue,
  onSave,
}) {
  if (!editable) {
    return (
      <span className="text-body-sm font-semibold text-on-surface">
        ${budgeted.toFixed(0)}
      </span>
    )
  }

  if (editingCell === categoryId) {
    return (
      <input
        autoFocus
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => onSave(categoryId)}
        onKeyDown={(e) => e.key === 'Enter' && onSave(categoryId)}
        className="w-20 rounded border border-cool-blue bg-surface-base px-1 py-0.5 text-center text-body-sm font-medium text-on-surface outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setEditingCell(categoryId)
        setEditValue(String(budgeted))
      }}
      className="inline-flex cursor-text items-center rounded border border-transparent px-1.5 py-0.5 text-body-sm font-medium text-on-surface hover:border-border-hairline hover:bg-surface-container"
    >
      <span>${budgeted.toFixed(0)}</span>
    </button>
  )
}

/** Visible flat rows from a category list + expanded map (supports 3 levels). */
function flattenVisible(categories, expandedGroups) {
  const tree = buildCategoryTree(categories, 'expense')
  const rows = []

  const walk = (nodes, depth) => {
    for (const node of nodes) {
      const role = getCategoryRole(categories, node)
      const hasChildren = node.children.length > 0
      rows.push({
        id: node.id,
        category: node,
        depth,
        role,
        isGroup: hasChildren || role === 'group' || role === 'parent',
      })
      if (hasChildren && expandedGroups[node.id] !== false) {
        walk(node.children, depth + 1)
      }
    }
  }

  walk(tree, 0)
  return rows
}

/**
 * Rebuild sort order from a flat visible order while preserving parent links
 * (parent → group → category nesting).
 */
function layoutFromFlatIds(flatIds, categories) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, { ...c }]))
  const orderIndex = Object.fromEntries(flatIds.map((id, i) => [id, i]))
  const byParent = new Map()

  for (const id of flatIds) {
    const cat = byId[id]
    if (!cat || cat.type !== 'expense' || isBudgetParent(cat)) continue
    const p = cat.parentId || null
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p).push(id)
  }

  for (const ids of byParent.values()) {
    ids.sort((a, b) => (orderIndex[a] ?? 0) - (orderIndex[b] ?? 0))
    ids.forEach((id, i) => {
      byId[id].sortOrder = (i + 1) * 10
    })
  }

  return Object.values(byId)
}

function CategoryRowContent({
  category,
  depth,
  role,
  isGroup,
  expanded,
  onToggleExpand,
  budgeted,
  activity,
  editingCell,
  editValue,
  setEditingCell,
  setEditValue,
  onSaveBudget,
  manageMode,
  onEditCategory,
  onAddChild,
  dragHandleProps,
  isOverlay = false,
}) {
  const available = budgeted - activity
  const isParent = role === 'parent'
  const isLeaf = role === 'category'
  const pad = depth === 0 ? '' : depth === 1 ? 'pl-5' : 'pl-10'

  const rowBg = isParent
    ? 'bg-surface-container-high/80 border-t border-border-hairline'
    : isGroup
      ? 'bg-surface-container/40'
      : ''

  const nameClass = isParent
    ? 'font-headline-sm font-bold uppercase tracking-wider text-on-surface'
    : isGroup
      ? 'font-bold uppercase tracking-wide text-on-surface'
      : 'font-medium text-on-surface'

  const canEditName = manageMode && !isOverlay && !isParent
  const canDrag = manageMode && !isParent
  const canAddChild = manageMode && isGroup && !isOverlay && !isParent

  return (
    <div
      className={`grid grid-cols-12 items-center py-1 ${rowBg} ${
        isOverlay
          ? 'rounded-lg border border-border-hairline bg-surface-container-high shadow-xl ring-1 ring-cool-blue/40'
          : ''
      }`}
    >
      <div className={`col-span-5 flex min-w-0 items-center gap-0.5 ${pad}`}>
        {canDrag ? (
          <button
            type="button"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-on-surface-variant active:cursor-grabbing hover:bg-surface-container hover:text-on-surface"
            title="Drag to reorder"
            aria-label={`Drag ${category.name}`}
            {...dragHandleProps}
          >
            <Icon name="menu" className="text-[16px]" />
          </button>
        ) : (
          <span className="w-6" />
        )}

        {isGroup ? (
          <button
            type="button"
            onClick={() => onToggleExpand?.(category.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            aria-label={expanded ? 'Collapse group' : 'Expand group'}
          >
            <Icon
              name={expanded ? 'expand_more' : 'chevron_right'}
              className="text-[18px]"
            />
          </button>
        ) : (
          <span className="w-6" />
        )}

        <span className="text-sm leading-none" aria-hidden>
          {category.emoji || '📁'}
        </span>

        {canEditName ? (
          <button
            type="button"
            onClick={() => onEditCategory(category)}
            className={`min-w-0 truncate rounded px-1 text-left text-body-sm hover:bg-surface-container ${nameClass}`}
            title="Edit category"
          >
            {category.name}
          </button>
        ) : (
          <span className={`min-w-0 truncate text-body-sm ${nameClass}`}>{category.name}</span>
        )}

        {canAddChild && (
          <button
            type="button"
            onClick={() => onAddChild(category.id)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Add category"
            aria-label={`Add category under ${category.name}`}
          >
            <Icon name="add" className="text-[14px]" />
          </button>
        )}
      </div>

      <div className="col-span-2 text-center">
        {isOverlay ? (
          <span className="text-body-sm font-medium text-on-surface">
            ${budgeted.toFixed(0)}
          </span>
        ) : (
          <MoneyCell
            categoryId={category.id}
            budgeted={budgeted}
            editable={isLeaf && !manageMode}
            editingCell={editingCell}
            editValue={editValue}
            setEditingCell={setEditingCell}
            setEditValue={setEditValue}
            onSave={onSaveBudget}
          />
        )}
      </div>
      <div className="col-span-2 text-center text-body-sm text-on-surface-variant">
        ${activity.toFixed(0)}
      </div>
      <div
        className={`col-span-3 flex items-center justify-end gap-1 text-right text-body-sm font-medium ${statusText(
          budgeted,
          activity
        )}`}
      >
        <span>
          {available < 0 ? '-' : ''}${Math.abs(available).toFixed(0)}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${statusDot(budgeted, activity)} ${
            available < 0 ? 'animate-pulse' : ''
          }`}
        />
      </div>
    </div>
  )
}

function SortableCategoryRow(props) {
  const { category, manageMode, role } = props
  const isParent = role === 'parent'
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !manageMode || isParent })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative border-b border-border-hairline/60">
      <CategoryRowContent
        {...props}
        dragHandleProps={manageMode && !isParent ? { ...attributes, ...listeners } : {}}
      />
    </div>
  )
}

export default function BudgetAllocationTable() {
  const storeCategories = useTransactionStore((state) => state.categories)
  const createCategory = useTransactionStore((state) => state.createCategory)
  const updateCategory = useTransactionStore((state) => state.updateCategory)
  const deleteCategory = useTransactionStore((state) => state.deleteCategory)
  const applyCategoryLayout = useTransactionStore((state) => state.applyCategoryLayout)

  const updateBudget = useBudgetStore((state) => state.updateBudget)
  const getBudgetedFor = useBudgetStore((state) => state.getBudgetedFor)
  const getActivityFor = useBudgetStore((state) => state.getActivityFor)
  const getTotalBudgeted = useBudgetStore((state) => state.getTotalBudgeted)
  const getTotalActivity = useBudgetStore((state) => state.getTotalActivity)
  const expandedGroups = useBudgetStore((state) => state.expandedGroups)
  const toggleGroup = useBudgetStore((state) => state.toggleGroup)

  const [manageMode, setManageMode] = useState(false)
  const [draftCategories, setDraftCategories] = useState(null)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [panel, setPanel] = useState(null)
  const [flash, setFlash] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)

  const categories = draftCategories || storeCategories

  useEffect(() => {
    if (manageMode && draftCategories) {
      const draftIds = new Set(draftCategories.map((c) => c.id))
      const extras = storeCategories.filter((c) => !draftIds.has(c.id))
      if (extras.length > 0) {
        setDraftCategories([...draftCategories, ...extras])
      }
    }
  }, [storeCategories, manageMode, draftCategories])

  const budgetParents = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'expense' && isBudgetParent(c)
      ),
    [categories]
  )

  const groups = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'expense' && getCategoryRole(categories, c) === 'group'
      ),
    [categories]
  )

  const categoryParents = useMemo(
    () => [...groups, ...budgetParents.filter((p) => p.name === 'Savings Goals')],
    [groups, budgetParents]
  )

  const flatRows = useMemo(
    () => flattenVisible(categories, expandedGroups),
    [categories, expandedGroups]
  )
  const flatIds = flatRows.map((r) => r.id)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const activeRow = activeId ? flatRows.find((r) => r.id === activeId) : null

  const draftBudgetedFor = (categoryId) => {
    const children = categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return children.reduce((sum, child) => sum + draftBudgetedFor(child.id), 0)
    }
    return getBudgetedFor(categoryId)
  }

  const draftActivityFor = (categoryId) => {
    const children = categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return children.reduce((sum, child) => sum + draftActivityFor(child.id), 0)
    }
    return getActivityFor(categoryId)
  }

  const handleSaveBudget = async (categoryId) => {
    const amount = parseFloat(editValue) || 0
    await updateBudget(categoryId, amount)
    setEditingCell(null)
  }

  const enterManageMode = () => {
    setDraftCategories(storeCategories.map((c) => ({ ...c })))
    setManageMode(true)
    setFlash(null)
  }

  const handleSave = async () => {
    if (!draftCategories) {
      setManageMode(false)
      return
    }
    setSaving(true)
    const layout = draftCategories
      .filter((c) => c.type === 'expense' && !isBudgetParent(c))
      .map((c) => ({
        id: c.id,
        parentId: c.parentId ?? null,
        sortOrder: c.sortOrder,
      }))
    const result = await applyCategoryLayout(layout)
    setSaving(false)
    if (!result.success) {
      setFlash(result.error)
      return
    }
    setDraftCategories(null)
    setPanel(null)
    setActiveId(null)
    setManageMode(false)
    setFlash(null)
  }

  const handleDragStart = (event) => {
    const row = flatRows.find((r) => r.id === event.active.id)
    if (row?.role === 'parent') return
    setActiveId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id || !draftCategories) return

    const activeRowLocal = flatRows.find((r) => r.id === active.id)
    const overRow = flatRows.find((r) => r.id === over.id)
    if (activeRowLocal?.role === 'parent' || overRow?.role === 'parent') return

    setDraftCategories((prev) => {
      const rows = flattenVisible(prev, expandedGroups)
      const ids = rows.map((r) => r.id)
      const from = ids.indexOf(active.id)
      const to = ids.indexOf(over.id)
      if (from < 0 || to < 0 || from === to) return prev
      const nextIds = arrayMove(ids, from, to)
      return layoutFromFlatIds(nextIds, prev)
    })
  }

  const handleDragEnd = () => {
    setActiveId(null)
  }

  const handleCreate = async (values) => {
    const role = panel?.addRole || 'category'
    const result = await createCategory({
      ...values,
      type: 'expense',
      parentId: values.parentId ?? panel?.parentId ?? null,
      role,
    })
    if (result.success) {
      setPanel(null)
      setFlash(role === 'group' ? 'Group added' : 'Category added')
      if (result.category) {
        setDraftCategories((prev) =>
          prev ? [...prev, result.category] : [result.category]
        )
        if (result.category.parentId) {
          useBudgetStore.setState((state) => ({
            expandedGroups: {
              ...state.expandedGroups,
              [result.category.parentId]: true,
            },
          }))
        }
      }
    }
    return result
  }

  const handleUpdate = async (values) => {
    if (panel?.category && isBudgetParent(panel.category)) {
      return { success: false, error: 'System budget parents cannot be edited.' }
    }
    const result = await updateCategory(panel.category.id, values)
    if (result.success) {
      setPanel(null)
      setFlash('Category updated')
      if (result.category) {
        setDraftCategories((prev) =>
          prev
            ? prev.map((c) => (c.id === result.category.id ? result.category : c))
            : prev
        )
      }
    }
    return result
  }

  const handleDeleteFromEdit = async () => {
    if (!panel?.category) return
    if (isBudgetParent(panel.category)) {
      setFlash('System budget parents cannot be deleted.')
      return
    }
    if (
      !window.confirm(
        `Remove "${panel.category.name}"? Transactions keep their history; this category will be unassigned.`
      )
    ) {
      return
    }
    const result = await deleteCategory(panel.category.id)
    if (!result.success) {
      setFlash(result.error)
      return
    }
    const removedId = panel.category.id
    setDraftCategories((prev) => (prev ? prev.filter((c) => c.id !== removedId) : prev))
    setPanel(null)
    setFlash(`Removed ${panel.category.name}`)
  }

  const totalBudgeted = getTotalBudgeted()
  const totalActivity = getTotalActivity()
  const totalAvailable = totalBudgeted - totalActivity

  const rowProps = (row) => ({
    category: row.category,
    depth: row.depth,
    role: row.role,
    isGroup: row.isGroup,
    expanded: expandedGroups[row.id] !== false,
    onToggleExpand: toggleGroup,
    budgeted: draftBudgetedFor(row.id),
    activity: draftActivityFor(row.id),
    editingCell,
    editValue,
    setEditingCell,
    setEditValue,
    onSaveBudget: handleSaveBudget,
    manageMode,
    onEditCategory: (cat) => {
      if (isBudgetParent(cat)) {
        setFlash('System budget parents cannot be edited.')
        return
      }
      setPanel({ mode: 'edit', category: cat })
    },
    onAddChild: (parentId) =>
      setPanel({
        mode: 'add',
        addRole: 'category',
        parentId,
        category: { emoji: '📁', type: 'expense', parentId },
      }),
  })

  const panelParents =
    panel?.addRole === 'group'
      ? budgetParents.filter((p) => p.name !== 'Savings Goals')
      : categoryParents

  return (
    <div className="flex flex-col rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
      {flash && <p className="mb-2 text-label-md text-sage-accent">{flash}</p>}

      {manageMode && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cool-blue/30 bg-cool-blue/10 px-2 py-1.5">
          <p className="text-label-md text-on-surface">
            Editing categories — drag groups and categories to reorder. Parents (Needs, Wants,
            Savings Goals, Other) stay fixed.
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setPanel({
                  mode: 'add',
                  addRole: 'group',
                  parentId: budgetParents.find((p) => p.name === 'Needs')?.id ?? null,
                  category: { emoji: '📂', type: 'expense' },
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-border-hairline bg-surface-base px-space-sm py-1 text-label-md font-semibold text-on-surface hover:bg-surface-container"
            >
              <Icon name="create_new_folder" className="text-[14px]" />
              Add group
            </button>
            <button
              type="button"
              onClick={() =>
                setPanel({
                  mode: 'add',
                  addRole: 'category',
                  parentId: groups[0]?.id ?? null,
                  category: { emoji: '📁', type: 'expense' },
                })
              }
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-sm py-1 text-label-md font-semibold text-on-primary"
            >
              <Icon name="add" className="text-[14px]" />
              Add category
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-sage-accent px-space-sm py-1 text-label-md font-semibold text-on-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {panel && manageMode && (
        <div className="mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-body-md font-bold text-on-surface">
              {panel.mode === 'add'
                ? panel.addRole === 'group'
                  ? 'Add group'
                  : 'Add category'
                : `Edit ${panel.category?.name}`}
            </h3>
            {panel.mode === 'edit' && !isBudgetParent(panel.category) && (
              <button
                type="button"
                onClick={handleDeleteFromEdit}
                className="inline-flex items-center gap-1 rounded-lg px-space-sm py-0.5 text-label-md text-status-error hover:bg-status-error/10"
              >
                <Icon name="delete" className="text-[14px]" />
                Delete
              </button>
            )}
          </div>
          <CategoryForm
            key={panel.category?.id || `add-${panel.addRole}-${panel.parentId || 'root'}`}
            initial={
              panel.mode === 'edit'
                ? panel.category
                : {
                    emoji: panel.addRole === 'group' ? '📂' : '📁',
                    type: 'expense',
                    parentId: panel.parentId,
                  }
            }
            parents={panelParents}
            addRole={panel.mode === 'add' ? panel.addRole : undefined}
            showType={false}
            allowParentChange={
              panel.mode === 'add' || !isBudgetParent(panel.category)
            }
            onSubmit={panel.mode === 'add' ? handleCreate : handleUpdate}
            onCancel={() => setPanel(null)}
            submitLabel={
              panel.mode === 'add'
                ? panel.addRole === 'group'
                  ? 'Add group'
                  : 'Add category'
                : 'Save changes'
            }
          />
        </div>
      )}

      <div className="grid grid-cols-12 border-b border-border-hairline pb-1.5 text-label-sm font-semibold tracking-wide text-on-surface-variant">
        <div className="col-span-5 flex items-center gap-1">
          <span>CATEGORY</span>
          <button
            type="button"
            onClick={() => (manageMode ? handleSave() : enterManageMode())}
            className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
              manageMode
                ? 'bg-cool-blue/20 text-cool-blue'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
            title={manageMode ? 'Save category changes' : 'Edit categories'}
            aria-label={manageMode ? 'Save category changes' : 'Edit categories'}
            aria-pressed={manageMode}
          >
            <Icon name="edit" className="text-[14px]" />
          </button>
        </div>
        <div className="col-span-2 text-center">BUDGETED</div>
        <div className="col-span-2 text-center">ACTIVITY</div>
        <div className="col-span-3 text-right">AVAILABLE</div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={manageMode ? handleDragOver : undefined}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragEnd}
      >
        <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">
            {flatRows.length === 0 && (
              <p className="py-space-md text-body-sm text-on-surface-variant">
                No categories yet. Use the pencil next to Category to add some.
              </p>
            )}
            {flatRows.map((row) => (
              <SortableCategoryRow key={row.id} {...rowProps(row)} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeRow ? (
            <div className="min-w-[min(100%,36rem)] cursor-grabbing">
              <CategoryRowContent
                {...rowProps(activeRow)}
                isOverlay
                dragHandleProps={{}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-2 grid grid-cols-12 items-center border-t border-border-hairline pt-2 font-bold text-on-surface">
        <div className="col-span-5 text-body-md">TOTALS</div>
        <div className="col-span-2 text-center text-body-md">${totalBudgeted.toFixed(0)}</div>
        <div className="col-span-2 text-center text-body-md text-on-surface-variant">
          ${totalActivity.toFixed(0)}
        </div>
        <div className="col-span-3 text-right text-body-md text-sage-accent">
          ${totalAvailable.toFixed(0)}
        </div>
      </div>
    </div>
  )
}
