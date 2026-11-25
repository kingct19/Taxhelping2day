'use client'

import { useMemo, useState } from 'react'
import {
  BlockStateProvider,
  BlockStateRows,
  type BlockStateProps,
} from '@/components/dashboardblocks/block-state'
import {
  KanbanAssignees,
  KanbanBoard,
  KanbanCard,
  KanbanCardMenu,
  KanbanCardTitle,
  KanbanColumn,
  KanbanDueDate,
  type KanbanColumnDef,
  type KanbanItem,
  getColumnItems,
  moveItem,
} from '@/components/dashboardblocks/kanban'
import { StatusLabel, statusToneClasses, type StatusTone } from '@/components/dashboardblocks/status-label'
import { ReturnFilters } from '@/components/tasks/return-filter-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface TaskCard extends KanbanItem {
  assignee: string | null
  ownerId?: string | null
  client: string
  email?: string
  entity?: string
  avatar?: string | null
  due: string | null
  overdue: boolean
  settled: boolean
  waiting: 'client' | 'staff' | null
  year: number
  tags?: string[]
}

interface Kanban3Props extends BlockStateProps {
  columns: KanbanColumnDef[]
  itemName?: { one: string; other: string }
  onMove?: (id: string, column: string, index: number) => boolean | void
  /** Noon UTC for the calendar day, so due dates match on the server and in the browser. */
  now: string
  onOpen?: (id: string) => void
  selectedId?: string | null
  /** Leave out, or pass none, to show empty columns. */
  tickets?: TaskCard[]
  title: string
  /** Signed-in preparer, so the board can filter to returns assigned to them. */
  viewerId?: string | null
}

const noTickets: TaskCard[] = []

const exampleProps: Kanban3Props = {
  columns: [
    { color: 'var(--color-chart-2)', id: 'documents', title: 'Documents' },
    { color: 'var(--color-chart-4)', id: 'preparation', title: 'Preparation' },
  ],
  now: '2026-11-23T12:00:00.000Z',
  tickets: [
    {
      assignee: 'Nora Hale',
      client: 'Ava Morales',
      column: 'documents',
      due: '2026-11-20',
      id: 'example',
      overdue: true,
      settled: false,
      title: "Review Ava's response",
      waiting: 'staff',
      year: 2025,
    },
  ],
  title: 'Returns',
}

function initials(name: string) {
  const letters = name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return letters || '?'
}

function glance(ticket: TaskCard): { label: string; tone: StatusTone } {
  if (ticket.settled) return { label: 'Delivered', tone: 'good' }
  if (ticket.overdue) return { label: 'Late', tone: 'bad' }
  switch (ticket.waiting) {
    case 'staff':
      return { label: 'On you', tone: 'warning' }
    case 'client':
      return { label: 'On client', tone: 'info' }
    case null:
      return { label: 'In motion', tone: 'neutral' }
    default: {
      const exhaustive: never = ticket.waiting
      return exhaustive
    }
  }
}

/** Drop index from the filtered board, mapped onto the full column so hidden cards keep their place. */
function fullDropIndex(all: TaskCard[], shown: TaskCard[], id: string, column: string, visibleIndex: number) {
  const anchor = getColumnItems(shown, column, id)[visibleIndex]
  const siblings = getColumnItems(all, column, id)
  if (!anchor) return siblings.length
  const at = siblings.findIndex((item) => item.id === anchor.id)
  return at === -1 ? siblings.length : at
}

function ReturnCard({ clock, ticket }: { clock: Date; ticket: TaskCard }) {
  const signal = glance(ticket)
  const due = ticket.due ? new Date(`${ticket.due}T12:00:00Z`) : null
  return (
    <>
      <div className='text-muted-foreground flex min-h-6 items-center gap-2 pr-7 text-xs'>
        <span className='font-mono'>{ticket.year}</span>
        <StatusLabel variant='text' tone={signal.tone} className='text-xs'>
          {signal.label}
        </StatusLabel>
      </div>
      <div className='flex flex-col gap-0.5'>
        <KanbanCardTitle className='line-clamp-2' />
        <div className='flex min-w-0 items-center gap-1.5'>
          <Avatar size='sm'>
            {ticket.avatar ? <AvatarImage src={ticket.avatar} alt='' /> : null}
            <AvatarFallback className={statusToneClasses[signal.tone]}>{initials(ticket.client)}</AvatarFallback>
          </Avatar>
          <p className='text-muted-foreground truncate text-xs'>{ticket.client}</p>
        </div>
      </div>
      {ticket.tags && ticket.tags.length > 0 ? (
        <div className='flex flex-wrap gap-1'>
          {ticket.tags.slice(0, 3).map((tag) => (
            <span key={tag} className='bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]'>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <KanbanCardMenu className='absolute top-3 right-2' />
      <div className='flex min-h-6 items-center gap-2'>
        {due ? (
          <KanbanDueDate date={due} done={ticket.settled} now={clock} timeZone='UTC' />
        ) : (
          <span className='text-muted-foreground text-xs'>No due date</span>
        )}
        {ticket.assignee ? (
          <KanbanAssignees className='ml-auto' names={[ticket.assignee]} />
        ) : (
          <span className='text-muted-foreground ml-auto text-xs'>Unassigned</span>
        )}
      </div>
    </>
  )
}

const Kanban3 = (props: Kanban3Props) => {
  const {
    columns,
    itemName = { one: 'return', other: 'returns' },
    now,
    onMove,
    onOpen,
    selectedId,
    errorMessage,
    status,
    tickets: loadedTickets = noTickets,
    title,
    viewerId = null,
  } = props
  const clock = useMemo(() => new Date(now), [now])
  const [moves, setMoves] = useState<{ column: string; id: string; index: number }[]>([])
  const tickets = useMemo(
    () =>
      moves.reduce(
        (current, move) => moveItem(current, move.id, move.column, move.index),
        [...loadedTickets],
      ),
    [loadedTickets, moves],
  )
  const state = status

  return (
    <BlockStateProvider errorMessage={errorMessage} state={state}>
      <section className='@container flex flex-col gap-3'>
        <h2 className='sr-only'>{title}</h2>
        {state === 'error' && <BlockStateRows className='border-t pt-3' />}
        {state !== 'error' && (
          <ReturnFilters items={tickets} viewerId={viewerId}>
            {(visible, filtering) => (
              <KanbanBoard
                className='pb-2'
                columns={columns}
                itemName={itemName}
                items={visible}
                label={`${title} board`}
                onMove={(id, column, index) => {
                  const at = fullDropIndex(tickets, visible, id, column, index)
                  if (onMove?.(id, column, at) === false) return false
                  setMoves((current) => [...current, { column, id, index: at }])
                }}
                onOpen={onOpen}
              >
                {columns.map((column) => (
                  <KanbanColumn key={column.id} column={column} empty={filtering ? 'No matches' : undefined}>
                    {getColumnItems(visible, column.id).map((ticket) => (
                      <KanbanCard
                        key={ticket.id}
                        className={cn(
                          'border border-border bg-white shadow-sm hover:bg-white hover:shadow-md [--kanban-card-surface:#fff] dark:border-transparent dark:bg-card dark:shadow-none dark:hover:bg-muted dark:[--kanban-card-surface:var(--color-card)]',
                          ticket.id === selectedId && 'ring-2 ring-primary',
                        )}
                        item={ticket}
                      >
                        <ReturnCard clock={clock} ticket={ticket} />
                      </KanbanCard>
                    ))}
                  </KanbanColumn>
                ))}
              </KanbanBoard>
            )}
          </ReturnFilters>
        )}
      </section>
    </BlockStateProvider>
  )
}

export { Kanban3, exampleProps as kanban3ExampleProps, type Kanban3Props }
