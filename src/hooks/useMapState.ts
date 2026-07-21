import { useContext } from 'react';

import {
  MapStateContext,
  type MapStateContextValue,
} from '../providers/MapStateProvider';

export function useMapState(): MapStateContextValue {
  const context = useContext(MapStateContext);

  if (context === undefined) {
    throw new Error(
      'useMapState must be used within a MapStateProvider.',
    );
  }

  return context;
}
