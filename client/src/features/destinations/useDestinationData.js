// React Query hooks for destinations and the road network (shared by Home, Permit and Plan pages).
import { useQuery } from "@tanstack/react-query";
import { listDestinations } from "../../api/destinations.js";
import { getRouteGraph } from "../../api/routes.js";

const TEN_MINUTES = 10 * 60 * 1000; // reference data changes rarely

/** Places to visit (waypoints such as Sela Pass are left out) */
export const useDestinations = () =>
  useQuery({
    queryKey: ["destinations", "list"],
    queryFn: () => listDestinations({ limit: 100 }).then((data) => data.items),
    staleTime: TEN_MINUTES
  });

/** Start cities: Guwahati, Itanagar */
export const useStartCities = () =>
  useQuery({
    queryKey: ["destinations", "start-cities"],
    queryFn: () => listDestinations({ isStartCity: true }).then((data) => data.items),
    staleTime: TEN_MINUTES
  });

export const useRouteGraph = () =>
  useQuery({ queryKey: ["routes", "graph"], queryFn: getRouteGraph, staleTime: TEN_MINUTES });
