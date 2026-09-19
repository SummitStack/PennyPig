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
  getRootCategories,
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

/** Visible flat rows from a category list + expanded map. */
function flattenVisible(categories, expandedGroups) {
  const tree = buildCategoryTree(categories, 'expense')
  const rows = []
  for (const root of tree) {
    const hasChildren = root.children.length > 0
    rows.push({
      id: root.id,
      category: root,
      depth: 0,
      isGroup: hasChildren,
    })
    if (hasChildren && expandedGroups[root.id] !== false) {
      for (const child of root.children) {
        rows.push({
          id: child.id,
          category: child,
          depth: 1,
          isGroup: false,
        })
      }
    }
  }
  return rows
}

/** Ids that act as group headers (have children in this category set). */
function groupIdSet(categories) {
  return new Set(
    categories.filter((c) => categories.some((x) => x.parentId === c.id)).map((c) => c.id)
  )
}

/**
 * Rebuild parent/sort from a flat visible order.
 * Group headers stay top-level; leaves attach to the nearest preceding group.
 */
function layoutFromFlatIds(flatIds, categories) {
  const groups = groupIdSet(categories)
  const byId = Object.fromEntries(categories.map((c) => [c.id, { ...c }]))
  let lastGroup = null
  let rootOrder = 0
  const childCount = {}

  for (const id of flatIds) {
    const cat = byId[id]
    if (!cat || cat.type !== 'expense') continue

    if (groups.has(id)) {
      cat.parentId = null
      rootOrder += 1
      cat.sortOrder = rootOrder * 10
      lastGroup = id
      childCount[id] = 0
    } else if (lastGroup) {
      cat.parentId = lastGroup
      childCount[lastGroup] = (childCount[lastGroup] || 0) + 1
      cat.sortOrder = childCount[lastGroup] * 10
    } else {
      cat.parentId = null
      rootOrder += 1
      cat.sortOrder = rootOrder * 10
    }
  }

  return Object.values(byId)
}

function CategoryRowContent({
  category,
  depth,
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
  const pad = depth === 0 ? '' : 'pl-5'

  return (
    <div
      className={`grid grid-cols-12 items-center py-1 ${
        isGroup ? 'bg-surface-container/40' : ''
      } ${isOverlay ? 'rounded-lg border border-border-hairline bg-surface-container-high shadow-xl ring-1 ring-cool-blue/40' : ''}`}
    >
      <div className={`col-span-5 flex min-w-0 items-center gap-0.5 ${pad}`}>
        {manageMode ? (
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

        {manageMode && !isOverlay ? (
          <button
            type="button"
            onClick={() => onEditCategory(category)}
            className={`min-w-0 truncate rounded px-1 text-left text-body-sm hover:bg-surface-container ${
              isGroup
                ? 'font-bold uppercase tracking-wide text-on-surface'
                : 'font-medium text-on-surface'
            }`}
            title="Edit category"
          >
            {category.name}
          </button>
        ) : (
          <span
            className={`min-w-0 truncate text-body-sm ${
              isGroup
                ? 'font-bold uppercase tracking-wide text-on-surface'
                : 'font-medium text-on-surface'
            }`}
          >
            {category.name}
          </span>
        )}

        {manageMode && isGroup && !isOverlay && (
          <button
            type="button"
            onClick={() => onAddChild(category.id)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Add subcategory"
            aria-label={`Add subcategory under ${category.name}`}
          >
            <Icon name="add" className="text-[14px]" />
          </button>
        )}
        {manageMode && !isGroup && depth === 0 && !isOverlay && (
          <button
            type="button"
            onClick={() => onAddChild(category.id)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Add subcategory (turns this into a group)"
            aria-label={`Add subcategory under ${category.name}`}
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
            editable={!isGroup}
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
  const { category, manageMode } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !manageMode })

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
        dragHandleProps={manageMode ? { ...attributes, ...listeners } : {}}
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
      // Keep draft in sync when store gains new categories from create
      const draftIds = new Set(draftCategories.map((c) => c.id))
      const extras = storeCategories.filter((c) => !draftIds.has(c.id))
      if (extras.length > 0) {
        setDraftCategories([...draftCategories, ...extras])
      }
    }
  }, [storeCategories, manageMode, draftCategories])

  const parents = useMemo(
    () => getRootCategories(categories).filter((c) => c.type === 'expense'),
    [categories]
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
      .filter((c) => c.type === 'expense')
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
    setActiveId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id || !draftCategories) return

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
    const creatingGroup = panel?.kind === 'group'
    const result = await createCategory({
      ...values,
      type: 'expense',
      parentId: creatingGroup
        ? null
        : values.parentId ?? panel?.parentId ?? null,
    })
    if (result.success) {
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

      if (creatingGroup && result.category) {
        // Expand the new group and immediately prompt for a subcategory
        useBudgetStore.setState((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [result.category.id]: true,
          },
        }))
        setFlash(`Group “${result.category.name}” created — add a subcategory`)
        setPanel({
          mode: 'add',
          kind: 'category',
          parentId: result.category.id,
          category: {
            emoji: '📁',
            type: 'expense',
            parentId: result.category.id,
          },
        })
      } else {
        setPanel(null)
        setFlash(
          result.category?.parentId ? 'Subcategory added' : 'Category added'
        )
      }
    }
    return result
  }

  const handleUpdate = async (values) => {
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
    if (
      !window.confirm(
        `Remove “${panel.category.name}”? Transactions keep their history; this category will be unassigned.`
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
    onEditCategory: (cat) => setPanel({ mode: 'edit', category: cat }),
    onAddChild: (parentId) =>
      setPanel({
        mode: 'add',
        kind: 'category',
        parentId,
        category: { emoji: '📁', type: 'expense', parentId },
      }),
  })

  return (
    <div className="flex flex-col rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
      {flash && <p className="mb-2 text-label-md text-sage-accent">{flash}</p>}

      {manageMode && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cool-blue/30 bg-cool-blue/10 px-2 py-1.5">
          <p className="text-label-md text-on-surface">
            Editing categories — drag ☰ to reorder. Use + on a group to add a
            subcategory. Click a name to edit.
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setPanel({
                  mode: 'add',
                  kind: 'group',
                  parentId: null,
                  category: { emoji: '📂', type: 'expense' },
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-surface-base px-space-sm py-1 text-label-md font-semibold text-primary hover:bg-primary/10"
            >
              <Icon name="create_new_folder" className="text-[14px]" />
              Add group
            </button>
            <button
              type="button"
              onClick={() =>
                setPanel({
                  mode: 'add',
                  kind: 'category',
                  parentId: null,
                  category: { emoji: '📁', type: 'expense' },
                })
              }
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-sm py-1 text-label-md font-semibold text-on-primary"
            >
              <Icon name="add" className="text-[14px]" />
              Add subcategory
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
              {panel.mode === 'edit'
                ? `Edit ${panel.category?.name}`
                : panel.kind === 'group'
                  ? 'Add parent group'
                  : panel.parentId
                    ? 'Add subcategory'
                    : 'Add subcategory'}
            </h3>
            {panel.mode === 'edit' && (
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
            key={
              panel.category?.id ||
              `add-${panel.kind || 'category'}-${panel.parentId || 'root'}`
            }
            initial={
              panel.mode === 'edit'
                ? panel.category
                : {
                    emoji: panel.kind === 'group' ? '📂' : '📁',
                    type: 'expense',
                    parentId: panel.parentId,
                  }
            }
            parents={parents}
            showType={false}
            role={
              panel.mode === 'edit'
                ? 'edit'
                : panel.kind === 'group'
                  ? 'group'
                  : 'category'
            }
            requireParent={
              panel.mode === 'add' &&
              panel.kind === 'category' &&
              Boolean(panel.parentId)
            }
            allowParentChange={
              panel.mode === 'edit' ||
              (panel.mode === 'add' && panel.kind === 'category')
            }
            onSubmit={panel.mode === 'add' ? handleCreate : handleUpdate}
            onCancel={() => setPanel(null)}
            submitLabel={
              panel.mode === 'edit'
                ? 'Save changes'
                : panel.kind === 'group'
                  ? 'Create group'
                  : 'Add subcategory'
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
