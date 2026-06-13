import {
  type CurrentOrgData,
  clearCurrentOrg,
  setCurrentOrg,
} from "@/hooks/use-current-org";
import { useEffect } from "react";

type OrgProviderProps = {
  org: CurrentOrgData;
};

export const OrgProvider = ({ org }: OrgProviderProps) => {
  useEffect(() => {
    setCurrentOrg(org);
  }, [org]);

  useEffect(() => {
    return () => clearCurrentOrg();
  }, []);

  return null;
};
