import { createContext, useState } from 'react'

const CollapseContext = createContext({
  isCollapsed: false,
  setIsCollapsed: () => { },
});

const CollapseProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <CollapseContext.Provider value={{isCollapsed, setIsCollapsed }}>
      { children }
    </CollapseContext.Provider>
  )
}

export { CollapseContext, CollapseProvider }
