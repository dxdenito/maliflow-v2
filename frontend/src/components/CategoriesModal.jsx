import { useState } from 'react'
import { Archive, Check, Pencil, RotateCcw, X } from 'lucide-react'
import Modal from './Modal'
import { getCategoryIcon } from '../config/categoryIcons'
import { getErrorMessage } from '../lib/api'
import { createCategory, updateCategory } from '../lib/categories'
import { inputClass } from '../lib/styles'

const iconButton =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:text-ink disabled:opacity-50'

function CategoriesModal({ categories, onChanged, onClose }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const active = categories.filter((category) => category.is_active)
  const archived = categories.filter((category) => !category.is_active)

  async function run(action) {
    setError('')
    setBusy(true)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function startEdit(category) {
    setEditingId(category.id)
    setEditName(category.name)
  }

  function handleAdd(event) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      return
    }
    run(async () => {
      await createCategory({ name })
      setNewName('')
    })
  }

  function handleRename(category) {
    const name = editName.trim()
    if (!name) {
      return
    }
    run(async () => {
      await updateCategory(category.id, { name })
      setEditingId(null)
    })
  }

  function handleArchive(category) {
    if (
      !window.confirm(
        'Archive this category? Past expenses keep it, but you will not be able to pick it for new ones.',
      )
    ) {
      return
    }
    run(() => updateCategory(category.id, { is_active: false }))
  }

  function handleRestore(category) {
    run(() => updateCategory(category.id, { is_active: true }))
  }

  function renderRow(category, isArchived) {
    const Icon = getCategoryIcon(category.icon)
    const editing = editingId === category.id

    return (
      <div key={category.id} className="flex items-center gap-3 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon size={18} />
        </span>

        {editing ? (
          <>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRename(category)
                }
              }}
              maxLength={60}
              autoFocus
              className={`${inputClass} py-2`}
            />
            <button
              onClick={() => handleRename(category)}
              disabled={busy}
              aria-label="Save name"
              className={`${iconButton} text-brand`}
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => setEditingId(null)}
              aria-label="Cancel"
              className={iconButton}
            >
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <span
              className={`min-w-0 flex-1 truncate font-medium ${
                isArchived ? 'text-muted' : ''
              }`}
            >
              {category.name}
            </span>
            {isArchived ? (
              <button
                onClick={() => handleRestore(category)}
                disabled={busy}
                aria-label="Restore category"
                className={iconButton}
              >
                <RotateCcw size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => startEdit(category)}
                  disabled={busy}
                  aria-label="Rename category"
                  className={iconButton}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleArchive(category)}
                  disabled={busy}
                  aria-label="Archive category"
                  className={iconButton}
                >
                  <Archive size={16} />
                </button>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <Modal title="Categories" onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            maxLength={60}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl bg-brand px-4 font-semibold text-on-brand transition hover:brightness-110 disabled:opacity-60"
          >
            Add
          </button>
        </form>

        <div className="divide-y divide-line">
          {active.map((category) => renderRow(category, false))}
        </div>

        {archived.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-semibold tracking-wide text-muted uppercase">
              Archived
            </p>
            <div className="divide-y divide-line">
              {archived.map((category) => renderRow(category, true))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default CategoriesModal