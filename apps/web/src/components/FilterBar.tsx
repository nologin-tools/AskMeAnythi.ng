import { Component } from 'solid-js';

export type FilterStatus = 'all' | 'pending' | 'answered' | 'unanswered';
export type SortBy = 'votes' | 'time';

interface FilterBarProps {
  status: FilterStatus;
  sortBy: SortBy;
  pendingCount?: number;
  showPending?: boolean;
  onStatusChange: (status: FilterStatus) => void;
  onSortChange: (sort: SortBy) => void;
}

const FilterBar: Component<FilterBarProps> = (props) => {
  return (
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Status filters (Segmented Control) */}
      <div class="inline-flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
        <button
          onClick={() => props.onStatusChange('all')}
          class="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
          classList={{
            'bg-white text-gray-900 shadow-sm': props.status === 'all',
            'text-gray-500 hover:text-gray-700': props.status !== 'all',
          }}
        >
          All
        </button>

        {props.showPending && (
          <button
            onClick={() => props.onStatusChange('pending')}
            class="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap relative"
            classList={{
              'bg-white text-gray-900 shadow-sm': props.status === 'pending',
              'text-gray-500 hover:text-gray-700': props.status !== 'pending',
            }}
          >
            Pending
            {props.pendingCount !== undefined && props.pendingCount > 0 && (
              <span class="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
                {props.pendingCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => props.onStatusChange('answered')}
          class="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
          classList={{
            'bg-white text-gray-900 shadow-sm': props.status === 'answered',
            'text-gray-500 hover:text-gray-700': props.status !== 'answered',
          }}
        >
          Answered
        </button>

        <button
          onClick={() => props.onStatusChange('unanswered')}
          class="flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
          classList={{
            'bg-white text-gray-900 shadow-sm': props.status === 'unanswered',
            'text-gray-500 hover:text-gray-700': props.status !== 'unanswered',
          }}
        >
          Unanswered
        </button>
      </div>

      {/* Sort options */}
      <div class="flex items-center gap-1 text-sm bg-white border border-gray-100 rounded-lg p-1 ml-auto sm:ml-0">
        <button
          onClick={() => props.onSortChange('votes')}
          class="px-3 py-1 rounded-md transition-all duration-200 flex items-center gap-1"
          classList={{
            'bg-primary-50 text-primary-700 font-medium': props.sortBy === 'votes',
            'text-gray-500 hover:bg-gray-50': props.sortBy !== 'votes',
          }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
          Popular
        </button>
        <button
          onClick={() => props.onSortChange('time')}
          class="px-3 py-1 rounded-md transition-all duration-200 flex items-center gap-1"
          classList={{
            'bg-primary-50 text-primary-700 font-medium': props.sortBy === 'time',
            'text-gray-500 hover:bg-gray-50': props.sortBy !== 'time',
          }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Newest
        </button>
      </div>
    </div>
  );
};

export default FilterBar;