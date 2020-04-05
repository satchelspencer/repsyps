import { useEffect, useState, RefObject } from 'react'

export default function useMeasure(container: RefObject<HTMLDivElement>) {
  const [pos, setPos] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const { left, top } = container.current
        ? container.current.getBoundingClientRect()
        : { left: 0, top: 0 },
      width = container.current ? container.current.offsetWidth : 0,
      height = container.current ? container.current.offsetHeight : 0
    setPos({ left, top, width, height })
  }, [container.current && container.current.offsetWidth])

  return pos
}
