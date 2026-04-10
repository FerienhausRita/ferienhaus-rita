import Link from "next/link";

interface RebookButtonProps {
  apartmentSlug: string;
}

export default function RebookButton({ apartmentSlug }: RebookButtonProps) {
  return (
    <div className="bg-gradient-to-br from-[#c8a96e]/10 to-[#c8a96e]/5 rounded-2xl border border-[#c8a96e]/20 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#c8a96e]/20 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-6 h-6 text-[#c8a96e]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-stone-900 mb-1">
            Nochmal buchen?
          </h3>
          <p className="text-sm text-stone-500 mb-4">
            Wir freuen uns auf Ihren nächsten Besuch! Als Stammgast erhalten Sie
            einen persönlichen Rabattcode per E-Mail.
          </p>
          <Link
            href={`/buchen?apartment=${apartmentSlug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c8a96e] text-white text-sm font-medium rounded-xl hover:bg-[#b8994e] transition-colors"
          >
            Erneut buchen
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
