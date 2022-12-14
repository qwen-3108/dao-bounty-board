import { debounce } from "lodash";
import { useMemo, useState } from "react";

interface SearchOptions<T> {
  fieldsToSearch: (keyof T)[]; // room for improvement: allow access to nested fields via dot notation
  caseInsensitive?: boolean;
}

export const useSearch = <T>(
  data: T[],
  { fieldsToSearch, caseInsensitive = true }: SearchOptions<T>
) => {
  const [searchTerm, setSearchTerm] = useState("");

  // can get a bit laggy when user is typing fast
  // to explore performance improvement solution again
  const result = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data; // do nothing

    const searchRegex = caseInsensitive
      ? new RegExp(searchTerm, "i")
      : new RegExp(searchTerm);

    return data.filter((d) =>
      fieldsToSearch.some((key) => searchRegex.test(JSON.stringify(d[key])))
    );
  }, [data, searchTerm]); // searchOptions is not a dependency because we don't expect searchOptions to change

  const updateSearchTerm = debounce((searchTerm: string) => {
    setSearchTerm(searchTerm);
  }, 500);

  const clearSearch = () => {
    setSearchTerm("");
  };

  return {
    result,
    searchTerm,
    updateSearchTerm,
    clearSearch,
  };
};
