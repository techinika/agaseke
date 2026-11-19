"use client";

import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { t } from "@/lib/i18n";
import type { VerificationFlowProps } from "./types";

type Props = Pick<
  VerificationFlowProps,
  | "isEditing"
  | "values"
  | "onValueChange"
  | "idFile"
  | "onFileChange"
  | "loading"
  | "onSubmit"
>;

export function PayoutDetailsCard({
  isEditing,
  values,
  onValueChange,
  idFile,
  onFileChange,
  loading,
  onSubmit,
}: Props) {
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="mb-1 text-title font-bold text-fg">
        {t("verification.form.title")}
      </h2>
      <p className="mb-6 text-label text-muted-fg">
        {t("verification.form.editingHint")}
      </p>
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            id="verification-mode"
            label={t("verification.form.mode")}
            value={values.payoutPreference}
            disabled={!isEditing}
            onChange={(event) => onValueChange("payoutPreference", event.target.value)}
          >
            <option value="momo">{t("verification.form.modeMomo")}</option>
            <option value="bank">{t("verification.form.modeBank")}</option>
            <option value="airtel">{t("verification.form.modeAirtel")}</option>
          </Select>
          <Input
            id="verification-country"
            label={t("verification.form.country")}
            value={values.country}
            disabled={!isEditing}
            autoComplete="country-name"
            onChange={(event) => onValueChange("country", event.target.value)}
          />
          <Input
            id="verification-provider"
            label={t("verification.form.provider")}
            value={values.bankName}
            disabled={!isEditing}
            onChange={(event) => onValueChange("bankName", event.target.value)}
            containerClassName="sm:col-span-2"
          />
          <Input
            id="verification-account-name"
            label={t("verification.form.accountName")}
            value={values.accountName}
            disabled={!isEditing}
            autoComplete="off"
            onChange={(event) => onValueChange("accountName", event.target.value)}
          />
          <Input
            id="verification-account-number"
            label={t("verification.form.accountNumber")}
            value={values.accountNumber}
            disabled={!isEditing}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => onValueChange("accountNumber", event.target.value)}
          />
          <Input
            id="verification-swift"
            label={t("verification.form.swift")}
            hint={t("verification.form.swiftHint")}
            value={values.swiftCode}
            disabled={!isEditing}
            onChange={(event) => onValueChange("swiftCode", event.target.value)}
            containerClassName="sm:col-span-2"
          />
        </div>

        <Input
          id="verification-document"
          label={t("verification.form.document")}
          hint={
            idFile
              ? t("verification.form.documentSelected", { name: idFile.name })
              : undefined
          }
          type="file"
          accept="image/*,application/pdf"
          disabled={!isEditing}
          required={isEditing}
          leading={<FileCheck2 className="size-4" aria-hidden="true" />}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <p className="text-caption leading-relaxed text-muted-fg">
          {t("verification.form.documentHint")}
        </p>

        {isEditing && (
          <Button type="submit" size="lg" fullWidth loading={loading}>
            {t("verification.form.submit")}
          </Button>
        )}
      </form>
    </Card>
  );
}
