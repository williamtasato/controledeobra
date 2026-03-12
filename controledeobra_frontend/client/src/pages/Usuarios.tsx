import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiService } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const userSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  role: z.enum(["user", "admin"]),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UsuariosPage() {
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: apiService.users.list,
  });

  const createMutation = useMutation({
    mutationFn: apiService.users.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário criado com sucesso");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar usuário: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.users.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário atualizado com sucesso");
      setIsDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar usuário: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiService.users.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir usuário: " + error.message);
    },
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id.toString(),
        ...values,
        password: values.password || undefined,
      });
    } else {
      if (!values.password) {
        toast.error("Senha é obrigatória para novos usuários");
        return;
      }
      createMutation.mutate(values as any);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.reset({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role as "user" | "admin",
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "user",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e permissões do sistema.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd}>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Editar Usuário" : "Adicionar Usuário"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Senha {editingUser && "(deixe em branco para não alterar)"}
                        </FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="******" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : !users || users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(user.id.toString())}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
