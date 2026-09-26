import { Comparator } from "@/components/comparator"
import type { Country, FxTable, SnapshotMeta } from "@/lib/types"
import countries from "../../data/snapshot/countries.json"
import fx from "../../data/snapshot/fx.json"
import meta from "../../data/snapshot/meta.json"

export default function HomePage() {
  return (
    <Comparator
      countries={countries as Country[]}
      fx={fx as FxTable}
      meta={meta as SnapshotMeta}
    />
  )
}
