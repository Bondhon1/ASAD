import { useEffect, useState } from 'react';

export default function useDelayedLoader(loading: boolean, delay = 300) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let t: number | undefined;
    if (loading) {
      t = window.setTimeout(() => setShow(true), delay);
    } else {
      setShow(false);
    }

    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [loading, delay]);

  return show;
}
