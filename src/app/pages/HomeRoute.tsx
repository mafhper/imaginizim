import { CompressionProvider } from '../providers/CompressionProvider';
import { HomePage } from './HomePage';

export function HomeRoute() {
  return (
    <CompressionProvider>
      <HomePage />
    </CompressionProvider>
  );
}
