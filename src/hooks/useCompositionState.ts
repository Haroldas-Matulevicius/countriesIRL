import { useContext } from 'react';

import {
  CompositionStateContext,
  type CompositionStateContextValue,
} from '../providers/CompositionStateProvider';

export function useCompositionState(): CompositionStateContextValue {
  const context = useContext(CompositionStateContext);

  if (context === undefined) {
    throw new Error(
      'useCompositionState must be used within a CompositionStateProvider.',
    );
  }

  return context;
}
